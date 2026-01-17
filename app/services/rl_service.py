"""Reinforcement Learning service for improving analysis over time"""

from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import numpy as np
import pickle
import logging
from pathlib import Path

from app.core.database import MongoDB

logger = logging.getLogger(__name__)


class RLService:
    """Service for reinforcement learning model training and prediction"""

    def __init__(self):
        self.model_path = Path("models/rl_model.pkl")
        self.scaler_path = Path("models/scaler.pkl")
        self.model = None
        self.scaler = None
        self._load_or_initialize_model()

    def _load_or_initialize_model(self):
        """Load existing model or initialize new one"""
        try:
            if self.model_path.exists():
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                logger.info("Loaded existing RL model")
            else:
                # Initialize new model
                self.model = RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42
                )
                self.scaler = StandardScaler()
                logger.info("Initialized new RL model")

                # Create models directory
                self.model_path.parent.mkdir(parents=True, exist_ok=True)

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Fallback to new model
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            self.scaler = StandardScaler()

    def extract_features(self, analysis: Dict[str, Any]) -> np.ndarray:
        """
        Extract features from analysis for ML model

        Features (13 total):
        1. vulnerability_count: Number of vulnerabilities found
        2. critical_count: Number of critical vulnerabilities
        3. high_count: Number of high severity vulnerabilities
        4. medium_count: Number of medium severity vulnerabilities
        5. low_count: Number of low severity vulnerabilities
        6. dependency_risk_count: Number of dependency risks
        7. critical_dep_count: Number of critical dependency risks
        8. execution_time: Total execution time
        9. tokens_used: Total tokens used
        10. files_analyzed: Number of files analyzed
        11. agent_count: Number of agents that ran
        12. avg_confidence: Average confidence score
        13. fix_generated: Whether a fix was generated (0/1)
        """
        try:
            vulns = analysis.get('vulnerabilities', [])
            deps = analysis.get('dependency_risks', [])

            # Count vulnerabilities by severity
            severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
            for vuln in vulns:
                severity = vuln.get('severity', 'low')
                if severity in severity_counts:
                    severity_counts[severity] += 1

            # Count dependency risks
            dep_severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
            for dep in deps:
                risk_level = dep.get('risk_level', 'low')
                if risk_level in dep_severity_counts:
                    dep_severity_counts[risk_level] += 1

            features = [
                len(vulns),  # 1. Total vulnerabilities
                severity_counts['critical'],  # 2. Critical vulns
                severity_counts['high'],  # 3. High vulns
                severity_counts['medium'],  # 4. Medium vulns
                severity_counts['low'],  # 5. Low vulns
                len(deps),  # 6. Dependency risks
                dep_severity_counts['critical'],  # 7. Critical deps
                analysis.get('total_execution_time', 0),  # 8. Execution time
                analysis.get('total_tokens_used', 0),  # 9. Tokens used
                analysis.get('file_mapping', {}).get('total_files', 0),  # 10. Files analyzed
                len(analysis.get('agent_analyses', [])),  # 11. Agent count
                0.5,  # 12. Avg confidence (placeholder)
                1 if analysis.get('pr_number') else 0  # 13. Fix generated
            ]

            return np.array(features).reshape(1, -1)

        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            # Return zero features as fallback
            return np.zeros((1, 13))

    async def predict_approval_probability(self, analysis: Dict[str, Any]) -> float:
        """
        Predict probability of user approving the fix

        Returns:
            Probability between 0 and 1
        """
        try:
            # Extract features
            features = self.extract_features(analysis)

            # Check if model is trained
            if not hasattr(self.model, 'classes_'):
                logger.warning("Model not trained yet, returning default probability")
                return 0.5

            # Scale features
            features_scaled = self.scaler.transform(features)

            # Predict probability
            proba = self.model.predict_proba(features_scaled)[0]

            # Return probability of approval (class 1)
            return float(proba[1])

        except Exception as e:
            logger.error(f"Error predicting approval: {e}")
            return 0.5  # Default to neutral probability

    async def update_model_with_feedback(
        self,
        analysis: Dict[str, Any],
        feedback: Dict[str, Any]
    ):
        """
        Update model with new feedback

        This implements online learning by retraining with new data
        """
        try:
            # Extract features from this analysis
            features = self.extract_features(analysis)
            label = 1 if feedback['approved'] else 0

            # Get all historical feedback
            db = MongoDB.get_database()
            cursor = db.user_feedback.find()
            feedback_data = await cursor.to_list(length=None)

            if len(feedback_data) < 10:
                logger.info("Not enough feedback data for training (need at least 10)")
                return

            # Build training dataset
            X_train = []
            y_train = []

            for fb in feedback_data:
                # Get corresponding analysis
                analysis_data = await db.analyses.find_one({'id': fb['analysis_id']})
                if analysis_data:
                    feats = self.extract_features(analysis_data)
                    X_train.append(feats[0])
                    y_train.append(1 if fb['approved'] else 0)

            X_train = np.array(X_train)
            y_train = np.array(y_train)

            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)

            # Train model
            self.model.fit(X_train_scaled, y_train)

            # Save updated model
            self._save_model()

            logger.info(f"Model updated with {len(y_train)} samples")

            # Log feature importances
            importances = self.model.feature_importances_
            logger.info(f"Top feature importances: {importances[:5]}")

        except Exception as e:
            logger.error(f"Error updating model: {e}", exc_info=True)

    def _save_model(self):
        """Save model to disk"""
        try:
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(self.scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
            logger.info("Model saved successfully")
        except Exception as e:
            logger.error(f"Error saving model: {e}")

    async def get_model_stats(self) -> Dict[str, Any]:
        """Get model statistics"""
        try:
            db = MongoDB.get_database()
            feedback_count = await db.user_feedback.count_documents({})

            stats = {
                'is_trained': hasattr(self.model, 'classes_'),
                'feedback_samples': feedback_count,
                'model_type': 'RandomForestClassifier',
                'n_estimators': self.model.n_estimators
            }

            if hasattr(self.model, 'feature_importances_'):
                stats['feature_importances'] = self.model.feature_importances_.tolist()

            return stats

        except Exception as e:
            logger.error(f"Error getting model stats: {e}")
            return {'error': str(e)}
