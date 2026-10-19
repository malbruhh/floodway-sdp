from fastapi import APIRouter, HTTPException, Response

from app.services import jps_client

router = APIRouter(prefix="/api/v1/jps", tags=["JPS Selangor cameras"])


@router.get("/cameras")
async def cameras():
    try:
        return await jps_client.list_cameras()
    except jps_client.UpstreamError as exc:
        raise HTTPException(502, str(exc))


@router.get("/cameras/{cam_id}/image")
async def camera_image(cam_id: int):
    try:
        body, ctype = await jps_client.get_image(cam_id)
    except KeyError:
        raise HTTPException(404, "Unknown camera")
    except jps_client.UpstreamError as exc:
        raise HTTPException(502, str(exc))
    return Response(body, media_type=ctype, headers={"Cache-Control": "public, max-age=30"})
