#!/usr/bin/env python3
"""
Database setup script for ProtectSUS

Creates necessary collections, indexes, and graph schema
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import AsyncGraphDatabase
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def setup_mongodb():
    """Setup MongoDB collections and indexes"""
    logger.info("Setting up MongoDB...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # Create collections
    collections = ['analyses', 'user_feedback', 'code_embeddings', 'chat_history']

    for collection in collections:
        if collection not in await db.list_collection_names():
            await db.create_collection(collection)
            logger.info(f"Created collection: {collection}")

    # Create indexes
    await db.analyses.create_index([("id", 1)], unique=True)
    await db.analyses.create_index([("repo_full_name", 1)])
    await db.analyses.create_index([("created_at", -1)])

    await db.user_feedback.create_index([("id", 1)], unique=True)
    await db.user_feedback.create_index([("analysis_id", 1)])

    await db.chat_history.create_index([("analysis_id", 1)])
    await db.chat_history.create_index([("timestamp", 1)])

    logger.info("MongoDB setup complete")

    client.close()


async def setup_neo4j():
    """Setup Neo4j graph schema and constraints"""
    logger.info("Setting up Neo4j...")

    driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
    )

    async with driver.session() as session:
        # Create constraints
        constraints = [
            "CREATE CONSTRAINT repo_unique IF NOT EXISTS FOR (r:Repository) REQUIRE r.full_name IS UNIQUE",
            "CREATE CONSTRAINT vuln_unique IF NOT EXISTS FOR (v:Vulnerability) REQUIRE v.id IS UNIQUE",
        ]

        for constraint in constraints:
            try:
                await session.run(constraint)
                logger.info(f"Created constraint: {constraint[:50]}...")
            except Exception as e:
                logger.warning(f"Constraint may already exist: {e}")

        # Create indexes
        indexes = [
            "CREATE INDEX file_path_idx IF NOT EXISTS FOR (f:File) ON (f.path)",
            "CREATE INDEX vuln_type_idx IF NOT EXISTS FOR (v:Vulnerability) ON (v.type)",
            "CREATE INDEX dep_package_idx IF NOT EXISTS FOR (d:Dependency) ON (d.package_name)",
        ]

        for index in indexes:
            try:
                await session.run(index)
                logger.info(f"Created index: {index[:50]}...")
            except Exception as e:
                logger.warning(f"Index may already exist: {e}")

    await driver.close()

    logger.info("Neo4j setup complete")


async def main():
    """Run database setup"""
    logger.info("Starting database setup...")

    try:
        await setup_mongodb()
        await setup_neo4j()
        logger.info("✅ Database setup complete!")

    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
