from django.urls import path, include
from rest_framework.routers import DefaultRouter
from appointments.views import DoctorAvailabilityViewSet, AvailableSlotsView, AppointmentViewSet

router = DefaultRouter()
router.register(r'availability', DoctorAvailabilityViewSet, basename='doctor-availability')
router.register(r'', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('doctors/<int:doctor_id>/available-slots/', AvailableSlotsView.as_view(), name='available-slots'),
    path('', include(router.urls)),
]
