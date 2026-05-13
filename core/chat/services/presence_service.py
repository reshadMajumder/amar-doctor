from django.utils import timezone
from ..models import ChatParticipantState

class PresenceService:
    @staticmethod
    def update_online_status(room, user, is_online):
        """
        Updates the participant's online status in the database.
        """
        state, _ = ChatParticipantState.objects.get_or_create(room=room, user=user)
        state.is_online = is_online
        state.last_seen_at = timezone.now()
        state.save()
        return state

    @staticmethod
    def update_typing_status(room, user, is_typing):
        """
        Updates typing status. 
        Note: The user requested ephemeral websocket events for typing,
        but we can also keep a DB flag if needed for "last seen" or similar.
        Per requirements: "Do NOT persist typing events in database."
        So we only return the status to be broadcasted.
        """
        return is_typing
