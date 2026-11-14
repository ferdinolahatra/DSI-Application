from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    ticket_numero = serializers.SerializerMethodField()
    annonce_titre = serializers.SerializerMethodField()

    class Meta:
        model = Notification

        fields = [
            'id',
            'type',
            'titre',
            'message',
            'ticket',
            'ticket_numero',
            'annonce',
            'annonce_titre',
            'lue',
            'date_creation',
            'date_lecture',
        ]

        read_only_fields = fields

    def get_ticket_numero(self, obj):
        if obj.ticket:
            return obj.ticket.numero

        return None

    def get_annonce_titre(self, obj):
        if obj.annonce:
            return obj.annonce.titre

        return None