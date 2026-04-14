from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.evidencia import Evidencia
from app.schemas.evidencia import EvidenciaActualizar, EvidenciaCrear


def obtener_evidencias_por_incidente(db: Session, incidente_id: int) -> list[Evidencia]:
    consulta: Select[tuple[Evidencia]] = select(Evidencia).where(Evidencia.incidente_id == incidente_id).order_by(Evidencia.id.desc())
    return list(db.scalars(consulta))


def obtener_evidencia_por_id(db: Session, evidencia_id: int) -> Evidencia | None:
    return db.get(Evidencia, evidencia_id)


def crear_evidencia(db: Session, incidente_id: int, payload: EvidenciaCrear) -> Evidencia:
    evidencia = Evidencia(
        incidente_id=incidente_id,
        tipo=payload.tipo,
        url_archivo=payload.url_archivo,
        transcripcion_texto=payload.transcripcion_texto,
    )
    db.add(evidencia)
    db.commit()
    db.refresh(evidencia)
    return evidencia


def actualizar_evidencia(db: Session, evidencia: Evidencia, payload: EvidenciaActualizar) -> Evidencia:
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(evidencia, campo, valor)

    db.add(evidencia)
    db.commit()
    db.refresh(evidencia)
    return evidencia


def eliminar_evidencia(db: Session, evidencia: Evidencia) -> None:
    db.delete(evidencia)
    db.commit()
