import os
from django.conf import settings
from io import BytesIO
from ..models import Prescription
from celery import shared_task
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

class PrescriptionPDFService:
    @staticmethod
    def generate_pdf(prescription_id):
        """
        Generates a professional PDF for a finalized prescription using ReportLab.
        """
        try:
            prescription = Prescription.objects.select_related('patient', 'doctor', 'appointment').prefetch_related('items').get(id=prescription_id)
        except Prescription.DoesNotExist:
            return None

        if prescription.status != Prescription.STATUS_FINALIZED:
            return None

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()
        
        # Custom Styles
        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.hexColor('#2c3e50'), spaceAfter=12)
        info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, leading=14)
        rx_style = ParagraphStyle('RxStyle', parent=styles['Heading1'], fontSize=24, textColor=colors.hexColor('#2c3e50'), spaceBefore=20, spaceAfter=10)

        elements = []

        # Header: Doctor Info
        elements.append(Paragraph(f"Dr. {prescription.doctor.get_full_name()}", title_style))
        elements.append(Paragraph(f"{getattr(prescription.doctor, 'specialization', 'Medical Consultant')}", info_style))
        elements.append(Paragraph(f"Reg No: {getattr(prescription.doctor, 'registration_number', 'N/A')}", info_style))
        elements.append(Spacer(1, 12))
        
        # Patient Info Table
        patient_data = [
            [f"Patient: {prescription.patient.get_full_name()}", f"Date: {prescription.finalized_at.strftime('%d %b %Y')}"],
            [f"Age/Gender: {getattr(prescription.patient, 'age', 'N/A')} / {getattr(prescription.patient, 'gender', 'N/A')}", f"Ref: {prescription.appointment.booking_reference}"]
        ]
        t = Table(patient_data, colWidths=[300, 150])
        t.setStyle(TableStyle([
            ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))
        elements.append(Table([['']], colWidths=[450], rowHeights=[1], style=[('LINEBELOW', (0,0), (-1,-1), 1, colors.hexColor('#2c3e50'))]))
        elements.append(Spacer(1, 12))

        # Diagnosis
        elements.append(Paragraph("<b>Diagnosis:</b>", info_style))
        elements.append(Paragraph(prescription.diagnosis_notes or "N/A", info_style))
        elements.append(Spacer(1, 20))

        # Rx
        elements.append(Paragraph("Rx", rx_style))

        # Medicines Table
        med_data = [['Medicine', 'Dosage', 'Frequency', 'Duration']]
        for item in prescription.items.all():
            med_data.append([
                Paragraph(f"<b>{item.medicine_name}</b><br/><font size='8'>{item.generic_name}</font><br/><font size='8'><i>{item.instruction}</i></font>", info_style),
                item.dosage,
                item.frequency,
                item.duration
            ])
        
        med_table = Table(med_data, colWidths=[200, 80, 80, 90])
        med_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.hexColor('#f8f9fa')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.hexColor('#2c3e50')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(med_table)
        elements.append(Spacer(1, 20))

        # Advice
        elements.append(Paragraph("<b>Advice:</b>", info_style))
        elements.append(Paragraph(prescription.advice_notes or "N/A", info_style))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("<b>Follow-up Instructions:</b>", info_style))
        elements.append(Paragraph(prescription.follow_up_instructions or "N/A", info_style))

        # Footer
        elements.append(Spacer(1, 50))
        elements.append(Paragraph("<hr/>", info_style))
        elements.append(Paragraph("<center>This is an electronically generated prescription. No signature required.</center>", info_style))
        elements.append(Paragraph("<center><b>Amardoctor AI-Assisted Telemedicine Platform</b></center>", info_style))

        doc.build(elements)
        pdf = buffer.getvalue()
        buffer.close()
        return pdf

@shared_task
def generate_pdf_task(prescription_id):
    """
    Celery task to generate and potentially store/email the PDF.
    """
    pdf_content = PrescriptionPDFService.generate_pdf(prescription_id)
    if pdf_content:
        # Future: Store in PrescriptionAttachment or S3
        pass
    return True
