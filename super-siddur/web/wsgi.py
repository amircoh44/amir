"""WSGI entrypoint: gunicorn 'web.wsgi:application' (run from the super-siddur dir)."""
from .app import app as application
