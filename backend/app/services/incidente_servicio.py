from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.historial_estado_incidente import HistorialEstadoIncidente
from app.models.incidente import Incidente
from app.models.vehiculo import Vehiculo
from app.schemas.incidente import IncidenteActualizarEstado, IncidenteCrear

TRANSICIONES_ESTADO_VALIDAS: dict[str, set[str]] = {
    "pendiente": {"en_proceso", "cancelado"},
    "en_proceso": {"atendido", "cancelado"},
    "atendido": {"cerrado"},
    "cerrado": set(),
    "cancelado": set(),
}


def obtener_vehiculo_de_cliente(db: Session, vehiculo_id: int, cliente_id: int) -> Vehiculo | None:
    consulta: Select[tuple[Vehiculo]] = select(Vehiculo).where(
        Vehiculo.id == vehiculo_id,
        Vehiculo.cliente_id == cliente_id,
    )
    return db.scalar(consulta)


def crear_incidente(db: Session, cliente_id: int, payload: IncidenteCrear) -> Incidente:
    incidente = Incidente(
        cliente_id=cliente_id,
        vehiculo_id=payload.vehiculo_id,
        latitud=payload.latitud,
        longitud=payload.longitud,
        descripcion=payload.descripcion,
        prioridad=payload.prioridad,
        estado="pendiente",
    )
    db.add(incidente)
    db.flush()

    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=None,
        estado_nuevo="pendiente",
        observacion="Incidente creado",
    )
    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente


def obtener_incidentes_por_cliente(db: Session, cliente_id: int) -> list[Incidente]:
    consulta: Select[tuple[Incidente]] = (
        select(Incidente)
        .where(Incidente.cliente_id == cliente_id)
        .options(selectinload(Incidente.historial_estados))
        .order_by(Incidente.id.desc())
    )
    return list(db.scalars(consulta))


def obtener_incidente_por_id(db: Session, incidente_id: int) -> Incidente | None:
    consulta: Select[tuple[Incidente]] = (
        select(Incidente)
        .where(Incidente.id == incidente_id)
        .options(selectinload(Incidente.historial_estados))
    )
    return db.scalar(consulta)


def actualizar_estado_incidente(
    db: Session,
    incidente: Incidente,
    payload: IncidenteActualizarEstado,
) -> Incidente:
    estado_actual = incidente.estado
    estado_nuevo = payload.estado_nuevo

    if estado_actual == estado_nuevo:
        return incidente

    estados_validos = TRANSICIONES_ESTADO_VALIDAS.get(estado_actual, set())
    if estado_nuevo not in estados_validos:
        raise ValueError(f"No se permite transicion de '{estado_actual}' a '{estado_nuevo}'")

    incidente.estado = estado_nuevo
    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_actual,
        estado_nuevo=estado_nuevo,
        observacion=payload.observacion,
    )
    db.add(incidente)
    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente