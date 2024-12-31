from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from pathlib import Path
from .schedulers.batch_scheduler import BatchScheduler
from .controllers.task_controller import TaskController
from .database.database import create_tables
from contextlib import asynccontextmanager


# 创建数据库表
create_tables()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.start()
    yield
    # Shutdown (if needed)
    scheduler.shutdown()


app = FastAPI(
    title="Batch Processing API",
    description="API for batch processing tasks",
    version="1.0.0",
    docs_url=None,  # 禁用默认的 docs URL
    redoc_url=None,  # 禁用默认的 redoc URL
    lifespan=lifespan
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 自定义 OpenAPI 和 Swagger UI 路由
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_endpoint():
    return get_openapi(
        title="Batch Processing API",
        version="1.0.0",
        description="API for batch processing tasks",
        routes=app.routes,
    )

# 添加根路由重定向
@app.get("/")
async def root():
    return RedirectResponse(url="/static/html/index.html")

# 挂载静态文件目录
static_dir = Path(__file__).resolve().parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# 注册 TaskController
task_controller = TaskController()
app.include_router(task_controller.router)

# 启动调度器
scheduler = BatchScheduler()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8123,
        # reload=True
    )
