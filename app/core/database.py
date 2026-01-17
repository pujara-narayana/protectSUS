"""Database connection managers for MongoDB, Neo4j, and Redis"""

from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import AsyncGraphDatabase
from redis import asyncio as aioredis
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager"""

    client: Optional[AsyncIOMotorClient] = None

    @classmethod
    async def connect(cls):
        """Establish MongoDB connection"""
        try:
            cls.client = AsyncIOMotorClient(settings.MONGODB_URI)
            await cls.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    @classmethod
    async def disconnect(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("Disconnected from MongoDB")

    @classmethod
    def get_database(cls):
        """Get the database instance"""
        if not cls.client:
            raise Exception("MongoDB not connected")
        return cls.client[settings.MONGODB_DB_NAME]


class Neo4jDB:
    """Neo4j connection manager"""

    driver: Optional[AsyncGraphDatabase] = None

    @classmethod
    async def connect(cls):
        """Establish Neo4j connection"""
        try:
            cls.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            await cls.driver.verify_connectivity()
            logger.info("Successfully connected to Neo4j")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    @classmethod
    async def disconnect(cls):
        """Close Neo4j connection"""
        if cls.driver:
            await cls.driver.close()
            logger.info("Disconnected from Neo4j")

    @classmethod
    def get_driver(cls):
        """Get the Neo4j driver instance"""
        if not cls.driver:
            raise Exception("Neo4j not connected")
        return cls.driver


class RedisDB:
    """Redis connection manager"""

    client: Optional[aioredis.Redis] = None

    @classmethod
    async def connect(cls):
        """Establish Redis connection"""
        try:
            cls.client = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await cls.client.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    @classmethod
    async def disconnect(cls):
        """Close Redis connection"""
        if cls.client:
            await cls.client.close()
            logger.info("Disconnected from Redis")

    @classmethod
    def get_client(cls):
        """Get the Redis client instance"""
        if not cls.client:
            raise Exception("Redis not connected")
        return cls.client


async def connect_databases():
    """Connect to all databases"""
    await MongoDB.connect()
    await Neo4jDB.connect()
    await RedisDB.connect()


async def disconnect_databases():
    """Disconnect from all databases"""
    await MongoDB.disconnect()
    await Neo4jDB.disconnect()
    await RedisDB.disconnect()
