from flask import (
    Blueprint,
    jsonify,
    redirect,
    render_template,
    url_for,
)

main = Blueprint("main", __name__)


@main.get("/health")
def health_check():
    return jsonify({"status": "ok"}), 200


@main.get("/")
def index():
    return render_template("index.html")


@main.errorhandler(400)
def bad_request(e):
    return render_template("errors/400.html"), 400


@main.errorhandler(401)
def unauthorized(e):
    return redirect(url_for("auth.login"))


@main.errorhandler(403)
def forbidden(e):
    return render_template("errors/403.html"), 403


@main.errorhandler(404)
def page_not_found(e):
    return render_template("errors/404.html"), 404


@main.errorhandler(500)
def internal_server_error(e):
    return render_template("errors/500.html"), 500


@main.errorhandler(503)
def service_unavailable(e):
    return render_template("errors/503.html"), 503
