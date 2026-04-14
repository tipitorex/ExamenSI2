from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.tecnico import Tecnico
from app.schemas.tecnico import TecnicoActualizar, TecnicoCrear


def crear_tecnico(db: Session, taller_id: int, payload: TecnicoCrear) -> Tecnico:
    tecnico = Tecnico(
        taller_id=taller_id,
        nombre_completo=payload.nombre_completo,
        telefono=payload.telefono,
        especialidad=payload.especialidad,
        disponible=True,
        activo=True,
    )
    db.add(tecnico)
    db.commit()
    db.refresh(tecnico)
    return tecnico


def listar_tecnicos_por_taller(db: Session, taller_id: int) -> list[Tecnico]:
    consulta: Select[tuple[Tecnico]] = select(Tecnico).where(Tecnico.taller_id == taller_id).order_by(Tecnico.id.desc())
    return list(db.scalars(consulta))


def obtener_tecnico_por_id(db: Session, tecnico_id: int) -> Tecnico | None:
    return db.get(Tecnico, tecnico_id)


def actualizar_tecnico(db: Session, tecnico: Tecnico, payload: TecnicoActualizar) -> Tecnico:
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(tecnico, campo, valor)
    db.add(tecnico)
    db.commit()
    db.refresh(tecnico)
    return tecnico


def actualizar_disponibilidad_tecnico(db: Session, tecnico: Tecnico, disponible: bool) -> Tecnico:
    tecnico.disponible = disponible
    db.add(tecnico)
    db.commit()
    db.refresh(tecnico)
    return tecnico


def eliminar_tecnico(db: Session, tecnico: Tecnico) -> None:
    db.delete(tecnico)
    db.commit()