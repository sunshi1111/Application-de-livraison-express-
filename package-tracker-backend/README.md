# Package Tracker Backend

FastAPI backend with SQLite persistence via SQLAlchemy.

## What changed
- Added `db.py`: SQLite engine, `SessionLocal`, and `init_db()`.
- Added `orm_models.py`: `PackageORM` and `HistoryEventORM` tables.
- Updated `main.py`:
  - Seeds generated packages into DB on first run or when regenerating system
  - Reads package data from DB for the following endpoints
    - `GET /api/system/data`
    - `GET /api/system/stats`
    - `GET /api/packages`
    - `GET /api/packages/{package_id}`
    - `POST /api/packages/search`
  - New endpoint: `POST /api/packages/update` to update status/location and append a history event.
- Updated `requirements.txt`: added `SQLAlchemy`.
- Updated `start_backend.bat`: now installs requirements if FastAPI or SQLAlchemy is missing.

SQLite file is created at `./data.db` in this folder.

## Run locally (Windows PowerShell)
```powershell
# From this folder
./start_backend.bat
# Or manually
./venv/Scripts/python.exe -X utf8 ./main.py
```

## Verify persistence
1. Start the server and open http://localhost:8000/docs
2. Call `GET /api/system/data` twice — you should see the same packages (persisted in DB)
3. Use `POST /api/packages/update` to change `status` or `currentLocation`, then `GET /api/packages/{id}` to see history recorded

## Notes
- Nodes (stations/centers) and edges remain in-memory, as they are derived from algorithmic generation.
- Packages and their histories are persisted in `data.db`.
- For Docker or different DB engines, adapt `DATABASE_URL` in `db.py`.
