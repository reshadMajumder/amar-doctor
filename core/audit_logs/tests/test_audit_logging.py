import pytest
from django.contrib.auth import get_user_model

from audit_logs.models import AuditLog
from audit_logs.services.audit_log_service import AuditLogService

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='audit_admin@test.com',
        password='testpass123',
        full_name='Audit Admin',
        role='admin',
        is_verified=True,
    )


@pytest.mark.django_db
class TestAuditLogModel:
    def test_audit_log_created_successfully(self, admin_user):
        log = AuditLog(
            actor=admin_user,
            action_type=AuditLog.ACTION_APPROVE,
            target_model='DoctorProfile',
            target_id=1,
        )
        log.save()
        assert log.pk is not None
        assert log.action_type == AuditLog.ACTION_APPROVE

    def test_audit_log_immutable_on_update(self, admin_user):
        log = AuditLog(
            actor=admin_user,
            action_type=AuditLog.ACTION_CREATE,
            target_model='User',
            target_id=admin_user.pk,
        )
        log.save()
        log.action_type = AuditLog.ACTION_DELETE
        with pytest.raises(ValueError, match='immutable'):
            log.save()

    def test_audit_log_immutable_on_delete(self, admin_user):
        log = AuditLog(
            actor=admin_user,
            action_type=AuditLog.ACTION_CREATE,
            target_model='User',
            target_id=admin_user.pk,
        )
        log.save()
        with pytest.raises(ValueError, match='immutable'):
            log.delete()


@pytest.mark.django_db
class TestAuditLogService:
    def test_service_creates_log(self, admin_user):
        log = AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_APPROVE,
            target_model='DoctorProfile',
            target_id=99,
            notes='Approved after review',
        )
        assert log is not None
        assert log.pk is not None
        assert log.actor == admin_user
        assert log.metadata.get('notes') == 'Approved after review'

    def test_service_returns_none_on_bad_action(self, admin_user):
        """Service must not raise on invalid action_type — it should return None and log the error."""
        # Pass an invalid action_type
        log = AuditLogService.log(
            actor=admin_user,
            action_type='__invalid__action__very_long_string_exceeding_the_limit' * 10,
            target_model='User',
            target_id=admin_user.pk,
        )
        assert log is None

    def test_log_from_target_obj(self, admin_user):
        log = AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_UPDATE,
            target_obj=admin_user,
        )
        assert log is not None
        assert log.target_model == 'User'
        assert log.target_id == admin_user.pk

    def test_log_approval_helper(self, admin_user):
        log = AuditLogService.log_approval(actor=admin_user, target_obj=admin_user, notes='ok')
        assert log is not None
        assert log.action_type == AuditLog.ACTION_APPROVE

    def test_log_suspension_helper(self, admin_user):
        log = AuditLogService.log_suspension(actor=admin_user, target_obj=admin_user, reason='abuse')
        assert log is not None
        assert log.action_type == AuditLog.ACTION_SUSPENSION
        assert log.metadata.get('reason') == 'abuse'
