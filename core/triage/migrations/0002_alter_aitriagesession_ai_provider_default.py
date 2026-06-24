from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('triage', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aitriagesession',
            name='ai_provider',
            field=models.CharField(default='groq', max_length=50),
        ),
    ]