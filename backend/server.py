from waitress import serve
from nconnect_backend.wsgi import application

if __name__ == '__main__':
    print("🚀 Starting N-Connect with Waitress...")
    print("📍 Admin: http://127.0.0.1:8000/admin/")
    print("📍 API: http://127.0.0.1:8000/api/")
    serve(application, host='127.0.0.1', port=8000)
