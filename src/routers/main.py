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
    return redirect(url_for("main.index"))


@main.errorhandler(401)
def unauthorized(e):
    return redirect(url_for("main.index"))


@main.errorhandler(403)
def forbidden(e):
    return redirect(url_for("main.index"))


@main.errorhandler(404)
def page_not_found(e):
    return redirect(url_for("main.index"))


@main.errorhandler(500)
def internal_server_error(e):
    return redirect(url_for("main.index"))


@main.errorhandler(503)
def service_unavailable(e):
    return redirect(url_for("main.index"))
