
from pathlib import Path
from datetime import timedelta


# ============================================================
# CONFIGURATION GÉNÉRALE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# IMPORTANT : conserve ici ta véritable clé secrète actuelle.
# Ne laisse pas le texte indicatif comme valeur réelle.
SECRET_KEY = 'lahatriniaina'

DEBUG = True

# Hôtes autorisés pour le développement local.
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
]


# ============================================================
# APPLICATIONS INSTALLÉES
# ============================================================

INSTALLED_APPS = [
    # Applications natives de Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Bibliothèques complémentaires
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Applications du projet DSI
    'accounts',
    'tickets',
    'interventions',
    'documents',
    'announcements',
    'notifications',
    'dashboard',
    'reports',
    'activity_logs',
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',

    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',

    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ============================================================
# URLS ET TEMPLATES
# ============================================================

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ============================================================
# SERVEUR DJANGO
# ============================================================

WSGI_APPLICATION = 'config.wsgi.application'


# ============================================================
# BASE DE DONNÉES POSTGRESQL
# ============================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'dsi_application',
        'USER': 'postgres',

        # Conserve ton mot de passe PostgreSQL actuel.
        'PASSWORD': 'azerty',

        'HOST': 'localhost',
        'PORT': '5432',
    }
}


# ============================================================
# MODÈLE UTILISATEUR PERSONNALISÉ
# ============================================================

AUTH_USER_MODEL = 'accounts.User'


# ============================================================
# VALIDATION DES MOTS DE PASSE
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME':
            'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME':
            'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME':
            'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME':
            'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ============================================================
# LANGUE, FUSEAU HORAIRE ET DATES
# ============================================================

LANGUAGE_CODE = 'fr-fr'

TIME_ZONE = 'Indian/Antananarivo'

USE_I18N = True

USE_TZ = True


# ============================================================
# FICHIERS STATIQUES ET FICHIERS ENVOYÉS
# ============================================================

STATIC_URL = '/static/'

# URL publique des fichiers téléversés.
MEDIA_URL = '/media/'

# Dossier physique des fichiers téléversés.
MEDIA_ROOT = BASE_DIR / 'media'


# ============================================================
# CONFIGURATION DES CLÉS PRIMAIRES
# ============================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.DsiJWTAuthentication',
    ],

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}


# ============================================================
# CONFIGURATION JWT
# ============================================================

SIMPLE_JWT = {
    # Le token d'accès expire après 15 minutes.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),

    # Le token de renouvellement expire après un jour.
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),

    # Génération d'un nouveau token de renouvellement.
    'ROTATE_REFRESH_TOKENS': True,

    # Révocation de l'ancien token après renouvellement.
    'BLACKLIST_AFTER_ROTATION': True,

    # Format de l'en-tête Authorization.
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ============================================================
# CORS — DÉVELOPPEMENT LOCAL UNIQUEMENT
# ============================================================

CORS_ALLOW_ALL_ORIGINS = True
