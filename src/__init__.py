import os
from datetime import timedelta

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from .routers.main import (
    bad_request,
    forbidden,
    internal_server_error,
    main,
    page_not_found,
    service_unavailable,
    unauthorized,
)


def create_app(database_url="sqlite:///db.sqlite"):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("_DATABASE_URL", database_url)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_POOL_SIZE"] = int(os.getenv("SQLALCHEMY_POOL_SIZE", 5))
    app.config["SQLALCHEMY_POOL_RECYCLE"] = int(
        os.getenv("SQLALCHEMY_POOL_RECYCLE", 1800)
    )
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
    app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=30)
    app.secret_key = os.getenv("SECRET_KEY", "060fb884-b441-4b3d-95d2-a3ea2b170a3a")

    if os.getenv("FLASK_ENV") == "testing":
        app.config["TESTING"] = True
        app.config["WTF_CSRF_ENABLED"] = False
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///test_db.sqlite"

    if app.config["DEBUG"] and not app.config["TESTING"]:
        app.config["DEBUG_TB_INTERCEPT_REDIRECTS"] = False
        app.config["SQLALCHEMY_RECORD_QUERIES"] = True
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
        # app.config["SQLALCHEMY_ECHO"] = True
    else:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    app.register_blueprint(main)

    app.register_error_handler(400, bad_request)
    app.register_error_handler(401, unauthorized)
    app.register_error_handler(403, forbidden)
    app.register_error_handler(404, page_not_found)
    app.register_error_handler(500, internal_server_error)
    app.register_error_handler(503, service_unavailable)

    return app


application = create_app()
