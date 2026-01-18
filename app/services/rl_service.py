"""Reinforcement Learning service for improving analysis over time"""

from typing import Dict, Any, List, Optional
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

        Features (20 total):
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
        14. feedback_sentiment: Sentiment score from feedback (-1=negative, 0=neutral, 1=positive)
        15. mentions_false_positive: Whether feedback mentions false positive (0/1)
        16. mentions_breaking_change: Whether feedback mentions breaking changes (0/1)
        17. requests_different_approach: Whether feedback requests different approach (0/1)
        18. feedback_specificity_score: How specific the feedback is (0-1)
        19. iteration_number: Current iteration number (1, 2, 3)
        20. time_to_feedback: Time from PR creation to feedback (hours, 0 if no feedback)
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

            # Extract feedback features (14-20)
            feedback_features = analysis.get('feedback_features', {})

            # Convert sentiment to numeric
            sentiment_map = {'negative': -1, 'neutral': 0, 'positive': 1}
            feedback_sentiment = sentiment_map.get(
                feedback_features.get('sentiment', 'neutral'),
                0
            )

            # Extract boolean flags
            mentions_false_positive = 1 if len(feedback_features.get('false_positive_flags', [])) > 0 else 0
            mentions_breaking_change = 1 if feedback_features.get('breaking_change_concerns', False) else 0
            requests_different_approach = 1 if len(feedback_features.get('requested_changes', [])) > 0 else 0

            # Specificity score
            feedback_specificity = float(feedback_features.get('specificity_score', 0.0))

            # Iteration number
            iteration_number = analysis.get('iteration_number', 1)

            # Time to feedback (in hours)
            time_to_feedback = 0.0
            if analysis.get('denied_at') and analysis.get('created_at'):
                from datetime import datetime
                if isinstance(analysis['denied_at'], str):
                    denied_at = datetime.fromisoformat(analysis['denied_at'].replace('Z', '+00:00'))
                else:
                    denied_at = analysis['denied_at']

                if isinstance(analysis['created_at'], str):
                    created_at = datetime.fromisoformat(analysis['created_at'].replace('Z', '+00:00'))
                else:
                    created_at = analysis['created_at']

                time_diff = denied_at - created_at
                time_to_feedback = time_diff.total_seconds() / 3600.0  # Convert to hours

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
                1 if analysis.get('pr_number') else 0,  # 13. Fix generated
                feedback_sentiment,  # 14. Feedback sentiment
                mentions_false_positive,  # 15. Mentions false positive
                mentions_breaking_change,  # 16. Mentions breaking change
                requests_different_approach,  # 17. Requests different approach
                feedback_specificity,  # 18. Feedback specificity score
                iteration_number,  # 19. Iteration number
                time_to_feedback  # 20. Time to feedback (hours)
            ]

            return np.array(features).reshape(1, -1)

        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            # Return zero features as fallback
            return np.zeros((1, 20))

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

    async def get_fix_guidance(
        self,
        analysis: Dict[str, Any],
        user_feedback: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get RL-based guidance for improving fixes

        Args:
            analysis: Current analysis data
            user_feedback: Optional user feedback text

        Returns:
            Dictionary with guidance:
            {
                "approval_probability": float,
                "risk_factors": List[str],
                "recommended_adjustments": List[str],
                "feature_insights": Dict[str, Any]
            }
        """
        try:
            # Predict approval probability
            approval_prob = await self.predict_approval_probability(analysis)

            # Extract features for analysis
            features = self.extract_features(analysis)

            # Analyze risk factors based on features and feedback
            risk_factors = []
            recommended_adjustments = []

            # Check if model is trained
            if not hasattr(self.model, 'classes_'):
                logger.warning("Model not trained, providing generic guidance")
                return {
                    "approval_probability": 0.5,
                    "risk_factors": ["Model not yet trained (insufficient feedback data)"],
                    "recommended_adjustments": ["Apply general security best practices"],
                    "feature_insights": {}
                }

            # Analyze feedback features
            feedback_features = analysis.get('feedback_features', {})

            # Risk factors based on feedback
            if feedback_features.get('sentiment') == 'negative':
                risk_factors.append("Previous feedback was negative")
                recommended_adjustments.append("Address specific concerns mentioned in feedback")

            if len(feedback_features.get('false_positive_flags', [])) > 0:
                risk_factors.append("User flagged potential false positives")
                recommended_adjustments.append("Re-verify vulnerability detection accuracy")

            if feedback_features.get('breaking_change_concerns'):
                risk_factors.append("Previous fix caused breaking changes")
                recommended_adjustments.append("Minimize code changes, preserve API compatibility")

            if len(feedback_features.get('requested_changes', [])) > 0:
                risk_factors.append("User requested specific changes")
                for change in feedback_features.get('requested_changes', [])[:3]:
                    recommended_adjustments.append(f"Apply requested change: {change}")

            # Risk factors based on vulnerability complexity
            vuln_count = len(analysis.get('vulnerabilities', []))
            if vuln_count > 5:
                risk_factors.append(f"High vulnerability count ({vuln_count})")
                recommended_adjustments.append("Prioritize critical and high severity fixes")

            # Risk factors based on iteration number
            iteration_number = analysis.get('iteration_number', 1)
            if iteration_number > 1:
                risk_factors.append(f"Already at iteration {iteration_number}")
                recommended_adjustments.append("Focus on addressing specific feedback points")

            # Feature importance insights (if model is trained)
            feature_insights = {}
            if hasattr(self.model, 'feature_importances_'):
                importances = self.model.feature_importances_
                feature_names = [
                    'vuln_count', 'critical_count', 'high_count', 'medium_count', 'low_count',
                    'dep_risk_count', 'critical_dep_count', 'execution_time', 'tokens_used',
                    'files_analyzed', 'agent_count', 'avg_confidence', 'fix_generated',
                    'feedback_sentiment', 'mentions_false_positive', 'mentions_breaking_change',
                    'requests_different_approach', 'feedback_specificity', 'iteration_number',
                    'time_to_feedback'
                ]

                # Get top 5 most important features
                top_indices = np.argsort(importances)[-5:][::-1]
                for idx in top_indices:
                    if idx < len(feature_names):
                        feature_insights[feature_names[idx]] = float(importances[idx])

            # Low approval probability warnings
            if approval_prob < 0.3:
                risk_factors.append(f"Low predicted approval probability ({approval_prob:.2%})")
                recommended_adjustments.append("Consider conservative, minimal changes")
            elif approval_prob < 0.5:
                risk_factors.append(f"Moderate approval probability ({approval_prob:.2%})")

            # Default recommendations if none specific
            if not recommended_adjustments:
                recommended_adjustments = [
                    "Apply security best practices",
                    "Minimize code changes",
                    "Add comments explaining changes",
                    "Preserve existing functionality"
                ]

            return {
                "approval_probability": float(approval_prob),
                "risk_factors": risk_factors,
                "recommended_adjustments": recommended_adjustments,
                "feature_insights": feature_insights
            }

        except Exception as e:
            logger.error(f"Error getting fix guidance: {e}", exc_info=True)
            return {
                "approval_probability": 0.5,
                "risk_factors": [f"Error generating guidance: {str(e)}"],
                "recommended_adjustments": ["Apply general security best practices"],
                "feature_insights": {}
            }
