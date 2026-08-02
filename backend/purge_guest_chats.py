"""
Data Retention Purge Script (GDPR Art. 5(1)(e))
Automatically purges unauthenticated guest chat sessions older than 30 days from SQL database
and associated temporary ChromaDB vector embeddings.
"""

from datetime import datetime, timedelta, timezone
import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

import database
import models
import rag
from sqlalchemy import or_

def purge_guest_chat_history(retention_days: int = 30) -> dict:
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
    db = database.SessionLocal()
    
    try:
        # Find guest chat conversations older than retention_days
        guest_query = db.query(models.AgentConversation).filter(
            or_(
                models.AgentConversation.userId == None,
                models.AgentConversation.userId == "",
                models.AgentConversation.userId.like("guest_%")
            ),
            models.AgentConversation.createdAt < cutoff_date
        )
        
        expired_chats = guest_query.all()
        purged_count = len(expired_chats)
        session_ids = [c.sessionId for c in expired_chats if c.sessionId]
        
        # Delete SQL rows
        guest_query.delete(synchronize_session=False)
        db.commit()
        
        # Clean ChromaDB vectors if matching session_ids or guest embeddings exist
        vector_purged_count = 0
        if session_ids:
            try:
                collection = rag.vector_store.get_or_create_collection("historical-agents")
                for s_id in set(session_ids):
                    try:
                        collection.delete(where={"sessionId": s_id})
                        vector_purged_count += 1
                    except Exception:
                        pass
            except Exception as chroma_err:
                print(f"ChromaDB guest vector purge warning: {chroma_err}", flush=True)

        log_msg = f"[retention-purge] Successfully purged {purged_count} guest chat rows older than {retention_days} days (cutoff: {cutoff_date.isoformat()})."
        print(log_msg, flush=True)
        
        return {
            "success": True,
            "purged_chats_count": purged_count,
            "purged_sessions_count": len(set(session_ids)),
            "vector_collections_cleaned": vector_purged_count,
            "cutoff_date": cutoff_date.isoformat(),
            "message": log_msg,
        }
    except Exception as exc:
        db.rollback()
        err_msg = f"[retention-purge-error] Failed to purge guest chat history: {exc}"
        print(err_msg, flush=True)
        return {"success": False, "error": str(exc), "message": err_msg}
    finally:
        db.close()

if __name__ == "__main__":
    days = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 30
    result = purge_guest_chat_history(retention_days=days)
    print(result)
