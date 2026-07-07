from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
OUTPUTS = ROOT / "outputs"

PLANILHA_OS = OUTPUTS / "ordens_servico_final_os.xlsx"
ARKMEDS_OS = OUTPUTS / "arkmeds_os_full_list.json"
SNAPSHOT = ROOT / "tmp_os_db_snapshot.json"
CLIENTES_OVERRIDES = Path(__file__).with_name("clientes_overrides.json")
OWNER_AUDIT = OUTPUTS / "arkmeds_conflicts_owner_audit.json"
EQUIPMENT_OWNER_AUDIT = OUTPUTS / "auditoria_empresas_equipamentos_arkmeds_todos.json"

PAYLOAD_PATH = OUTPUTS / "migracao_os_payload.json"
REVISAO_PATH = OUTPUTS / "migracao_os_revisao.xlsx"
RESUMO_PATH = OUTPUTS / "migracao_os_resumo.json"


def norm(value: Any) -> str:
    text = str(value or "").strip()
    text = "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )
    text = re.sub(r"\s+", " ", text)
    return text.casefold()


def clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "nat"}:
        return ""
    return text


def parse_int(value: Any) -> int | None:
    text = clean(value)
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def parse_dt(value: Any) -> str | None:
    text = clean(value)
    if not text:
        return None
    parsed = pd.to_datetime(text, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.isoformat()


def colmap(df: pd.DataFrame) -> dict[str, str]:
    return {norm(col).upper(): col for col in df.columns}


def get_col(cols: dict[str, str], name: str) -> str:
    key = norm(name).upper()
    if key not in cols:
        raise KeyError(f"Coluna obrigatoria ausente: {name}")
    return cols[key]


def prioridade(value: str) -> str:
    key = norm(value)
    if key in {"pouco urgente", "baixa"}:
        return "baixa"
    if key in {"urgente", "alta"}:
        return "alta"
    if key in {"muito urgente", "emergente"}:
        return "urgente"
    return "normal"


def make_observacoes(row: pd.Series, cols: dict[str, str], arkmeds_id: str, motivo: str = "") -> str:
    partes = []
    obs = clean(row.get(get_col(cols, "OBSERVACOES")))
    if obs:
        partes.append(obs)

    for label in ("AJUSTE MIGRACAO ESTADO", "AJUSTE MIGRACAO TIPO"):
        ajuste = clean(row.get(get_col(cols, label)))
        if ajuste:
            partes.append(ajuste)

    campo_extra = clean(row.get(get_col(cols, "CAMPO EXTRA")))
    if campo_extra:
        partes.append(f"Campo extra Arkmeds: {campo_extra}")

    if motivo:
        partes.append(motivo)

    partes.append(f"Importado do historico Arkmeds. ID Arkmeds: {arkmeds_id}.")
    return "\n".join(dict.fromkeys(partes))


def setor_override_origem(override: dict[str, Any] | None, solicitante_texto: str) -> str:
    if override and clean(override.get("setor")):
        return clean(override.get("setor"))

    if " - " in solicitante_texto:
        return clean(solicitante_texto.rsplit(" - ", 1)[-1])

    return ""


def main() -> None:
    df = pd.read_excel(PLANILHA_OS, sheet_name="OrdensServico", dtype=str).fillna("")
    cols = colmap(df)

    arkmeds_rows = json.loads(ARKMEDS_OS.read_text(encoding="utf-8"))["data"]
    arkmeds_by_id = {str(item.get("id")): item for item in arkmeds_rows}
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    clientes_overrides = json.loads(CLIENTES_OVERRIDES.read_text(encoding="utf-8"))

    empresas_by_num = {
        str(item.get("numero_cadastro")): item
        for item in snapshot["empresas"]
        if item.get("numero_cadastro") is not None
    }
    equipamentos_by_num = {
        str(item.get("numero_cadastro")): item
        for item in snapshot["equipamentos"]
        if item.get("numero_cadastro") is not None
    }
    tipos_eq_by_norm = {norm(item.get("nome")): item for item in snapshot["tiposEquipamento"]}
    tipos_os_by_norm = {
        norm(item.get("nome")): item
        for item in snapshot["tiposOs"]
        if item.get("ativo")
    }
    estados_by_norm = {
        norm(item.get("nome")): item
        for item in snapshot["estadosOs"]
        if item.get("ativo")
    }
    usuarios_by_norm = {
        norm(item.get("nome")): item
        for item in snapshot.get("usuarios", [])
        if item.get("ativo")
    }
    numeros_os_existentes = {
        str(item.get("numero"))
        for item in snapshot.get("osExistentes", [])
        if item.get("numero") is not None
    }
    numeros_os_existentes_int = [
        numero
        for numero in (parse_int(item.get("numero")) for item in snapshot.get("osExistentes", []))
        if numero is not None
    ]
    numeros_planilha_int = [
        numero
        for numero in (parse_int(row.get(get_col(cols, "NUMERO"))) for _, row in df.iterrows())
        if numero is not None
    ]
    numeros_colididos = sorted(
        {
            clean(row.get(get_col(cols, "NUMERO")))
            for _, row in df.iterrows()
            if clean(row.get(get_col(cols, "NUMERO"))) in numeros_os_existentes
        },
        key=lambda item: (parse_int(item) if parse_int(item) is not None else 10**18, item),
    )
    proximo_numero_remapeado = (
        max([0, *numeros_os_existentes_int, *numeros_planilha_int]) + 1
    )
    numeros_remapeados = {
        numero: str(proximo_numero_remapeado + index)
        for index, numero in enumerate(numeros_colididos)
    }
    arkmeds_ids_sem_numero = [
        clean(row.get(get_col(cols, "ID")))
        for _, row in df.iterrows()
        if not clean(row.get(get_col(cols, "NUMERO"))) and clean(row.get(get_col(cols, "ID")))
    ]
    numeros_gerados_sem_numero = {
        arkmeds_id: str(proximo_numero_remapeado + len(numeros_colididos) + index)
        for index, arkmeds_id in enumerate(arkmeds_ids_sem_numero)
    }

    automaticas: list[dict[str, Any]] = []
    equipamentos_historicos: dict[str, dict[str, Any]] = {}
    equipamentos_owner_updates: dict[str, dict[str, Any]] = {}
    revisao: list[dict[str, Any]] = []
    resumo = Counter()

    owner_audit = {}
    if OWNER_AUDIT.exists():
        owner_rows = json.loads(OWNER_AUDIT.read_text(encoding="utf-8"))
        owner_audit = {
            str(item.get("arkmeds_os_id")): item
            for item in owner_rows
        }

    equipment_owner_audit = {}
    if EQUIPMENT_OWNER_AUDIT.exists():
        equipment_owner_rows = json.loads(EQUIPMENT_OWNER_AUDIT.read_text(encoding="utf-8"))
        equipment_owner_audit = {
            str(item.get("equipamento_numero_cadastro")): item
            for item in equipment_owner_rows
            if item.get("equipamento_numero_cadastro")
        }

    for _, row in df.iterrows():
        arkmeds_id = clean(row.get(get_col(cols, "ID")))
        numero_original = clean(row.get(get_col(cols, "NUMERO")))
        numero_os = (
            numeros_remapeados.get(numero_original)
            or numeros_gerados_sem_numero.get(arkmeds_id)
            or numero_original
        )
        solicitante_texto = clean(row.get(get_col(cols, "SOLICITANTE")))
        numero_remapeado_motivo = ""
        if numero_os != numero_original:
            if numero_original:
                numero_remapeado_motivo = (
                    f"Numero original Arkmeds {numero_original} remapeado para {numero_os} "
                    "porque ja existia no banco novo."
                )
            else:
                numero_remapeado_motivo = (
                    f"Numero gerado para OS Arkmeds {arkmeds_id}: {numero_os}, "
                    "pois a origem nao possuia numero de OS."
                )

        base_revisao = row.to_dict()
        base_revisao["ARKMEDS_ID"] = arkmeds_id
        base_revisao["NUMERO_MIGRACAO"] = numero_os
        base_revisao["MIGRACAO_STATUS"] = ""
        base_revisao["MIGRACAO_MOTIVO"] = ""

        if "hospital alfa" in norm(solicitante_texto):
            resumo["excluida_hospital_alfa"] += 1
            base_revisao["MIGRACAO_STATUS"] = "excluida"
            base_revisao["MIGRACAO_MOTIVO"] = "Hospital Alfa/teste excluido conforme orientacao."
            revisao.append(base_revisao)
            continue

        if numero_os in numeros_os_existentes:
            resumo["pulada_numero_ja_existe"] += 1
            base_revisao["MIGRACAO_STATUS"] = "pulada"
            base_revisao["MIGRACAO_MOTIVO"] = "Numero de OS ja existe no banco novo."
            revisao.append(base_revisao)
            continue

        api = arkmeds_by_id.get(arkmeds_id)
        if not api:
            resumo["revisao_sem_api"] += 1
            base_revisao["MIGRACAO_STATUS"] = "revisao"
            base_revisao["MIGRACAO_MOTIVO"] = "ID interno da Arkmeds nao encontrado na extracao da API."
            revisao.append(base_revisao)
            continue

        cliente_legado_id = str(api.get("solicitante") or "")
        equipamento_legado_id = str(api.get("equipamento") or "")

        if cliente_legado_id == "284" or norm(solicitante_texto) == "aline":
            resumo["excluida_aline"] += 1
            base_revisao["MIGRACAO_STATUS"] = "excluida"
            base_revisao["MIGRACAO_MOTIVO"] = "Aline/cliente legado 284 excluida conforme orientacao."
            revisao.append(base_revisao)
            continue

        empresa = empresas_by_num.get(cliente_legado_id)
        cliente_override = None
        cliente_override_observacao = ""
        setor_override = ""

        if not empresa and cliente_legado_id in clientes_overrides:
            cliente_override = clientes_overrides[cliente_legado_id]
            empresa = empresas_by_num.get(str(cliente_override.get("cliente_numero_cadastro")))
            cliente_override_observacao = clean(cliente_override.get("observacao"))
            setor_override = setor_override_origem(cliente_override, solicitante_texto)

        equipamento = equipamentos_by_num.get(equipamento_legado_id)

        if not empresa:
            resumo["revisao_cliente_ausente"] += 1
            base_revisao["MIGRACAO_STATUS"] = "revisao"
            base_revisao["MIGRACAO_MOTIVO"] = (
                f"Cliente legado {cliente_legado_id} nao encontrado no banco novo."
            )
            revisao.append(base_revisao)
            continue

        tipo_os_nome = clean(row.get(get_col(cols, "TIPO SERVICO")))
        estado_nome = clean(row.get(get_col(cols, "ESTADO")))
        tipo_os = tipos_os_by_norm.get(norm(tipo_os_nome))
        estado_os = estados_by_norm.get(norm(estado_nome))

        if not tipo_os:
            resumo["revisao_tipo_os_ausente"] += 1
            base_revisao["MIGRACAO_STATUS"] = "revisao"
            base_revisao["MIGRACAO_MOTIVO"] = f"Tipo de OS nao encontrado/ativo: {tipo_os_nome}"
            revisao.append(base_revisao)
            continue

        if not estado_os:
            resumo["revisao_estado_os_ausente"] += 1
            base_revisao["MIGRACAO_STATUS"] = "revisao"
            base_revisao["MIGRACAO_MOTIVO"] = f"Estado de OS nao encontrado/ativo: {estado_nome}"
            revisao.append(base_revisao)
            continue

        tipo_equipamento_nome = clean(row.get(get_col(cols, "TIPO DE EQUIPAMENTO")))
        tipo_equipamento = tipos_eq_by_norm.get(norm(tipo_equipamento_nome))

        equipamento_id = None
        equipamento_modo = ""
        motivo_observacao = ""

        if equipamento_legado_id and equipamento and equipamento.get("empresa_id") == empresa["id"]:
            equipamento_id = equipamento["id"]
            equipamento_modo = "existente"
            resumo["automatica_equipamento_existente"] += 1
        elif equipamento_legado_id and equipamento:
            audit = owner_audit.get(arkmeds_id)
            if audit and audit.get("classificacao") == "proprietario_bate_com_equipamento_novo":
                equipamento_id = equipamento["id"]
                equipamento_modo = "existente_solicitante_diferente_proprietario"
                resumo["automatica_solicitante_diferente_proprietario"] += 1
                motivo_observacao = (
                    "Na Arkmeds, o solicitante desta OS e diferente do proprietario do equipamento; "
                    "proprietario do equipamento preservado conforme Arkmeds."
                )
            elif audit and audit.get("classificacao") == "proprietario_bate_com_solicitante_os":
                equipamento_id = equipamento["id"]
                equipamento_modo = "existente_corrigir_proprietario"
                resumo["automatica_corrigir_proprietario_equipamento"] += 1
                equipamentos_owner_updates[equipamento["id"]] = {
                    "equipamento_id": equipamento["id"],
                    "numero_cadastro": equipamento.get("numero_cadastro"),
                    "empresa_id_atual": equipamento.get("empresa_id"),
                    "empresa_id_correta": empresa["id"],
                    "cliente_atual_nome": audit.get("cliente_equipamento_novo_nome"),
                    "cliente_correto_nome": audit.get("cliente_os_novo_nome"),
                    "arkmeds_proprietario": audit.get("ark_proprietario"),
                    "arkmeds_equipamento_id": audit.get("arkmeds_equipamento_id"),
                    "motivo": "Proprietario do equipamento na Arkmeds bate com o solicitante da OS.",
                }
                motivo_observacao = (
                    "Equipamento existente no banco novo tinha proprietario diferente; "
                    "proprietario sera corrigido conforme Arkmeds antes da importacao."
                )
            else:
                equipment_audit = equipment_owner_audit.get(equipamento_legado_id)
                equipamento_empresa_id = equipamento.get("empresa_id")
                auditoria_confirma_proprietario_atual = (
                    equipment_audit
                    and (
                        equipment_audit.get("empresa_atual_id") == equipamento_empresa_id
                        or equipment_audit.get("empresa_sugerida_id") == equipamento_empresa_id
                    )
                    and clean(equipment_audit.get("arkmeds_proprietario"))
                )

                if auditoria_confirma_proprietario_atual:
                    equipamento_id = equipamento["id"]
                    equipamento_modo = "existente_solicitante_diferente_proprietario"
                    resumo["automatica_solicitante_diferente_proprietario"] += 1
                    motivo_observacao = (
                        "Na Arkmeds, o solicitante desta OS e diferente do proprietario do equipamento; "
                        "proprietario do equipamento preservado conforme auditoria de equipamentos Arkmeds."
                    )
                else:
                    resumo["revisao_equipamento_outro_cliente"] += 1
                    base_revisao["MIGRACAO_STATUS"] = "revisao"
                    base_revisao["MIGRACAO_MOTIVO"] = (
                        f"Equipamento legado {equipamento_legado_id} existe, mas pertence a outro cliente."
                    )
                    revisao.append(base_revisao)
                    continue
        elif equipamento_legado_id:
            equipamento_modo = "historico_desativado"
            motivo_observacao = (
                f"Equipamento legado {equipamento_legado_id} criado desativado para preservar historico de OS."
            )
            if cliente_override_observacao:
                motivo_observacao = f"{motivo_observacao}\n{cliente_override_observacao}"
            resumo["automatica_equipamento_historico"] += 1
            if equipamento_legado_id not in equipamentos_historicos:
                equipamentos_historicos[equipamento_legado_id] = {
                    "numero_cadastro": int(equipamento_legado_id),
                    "empresa_id": empresa["id"],
                    "cliente_legado_id": cliente_legado_id,
                    "tipo_equipamento_nome": tipo_equipamento_nome,
                    "tipo_equipamento_id": tipo_equipamento.get("id") if tipo_equipamento else None,
                    "tipo_texto": tipo_equipamento_nome or None,
                    "fabricante": clean(row.get(get_col(cols, "FABRICANTE"))) or None,
                    "modelo": clean(row.get(get_col(cols, "MODELO"))) or None,
                    "numero_serie": clean(row.get(get_col(cols, "NUMERO DE SERIE"))) or None,
                    "patrimonio": clean(row.get(get_col(cols, "PATRIMONIO"))) or None,
                    "tag": clean(row.get(get_col(cols, "TAG"))) or None,
                    "setor": clean(row.get(get_col(cols, "LOCALIZACAO"))) or setor_override or None,
                    "status": "Desativado",
                    "ativo": False,
                    "observacoes": motivo_observacao,
                }
        else:
            equipamento_modo = "sem_equipamento"
            resumo["automatica_sem_equipamento_id"] += 1

        data_abertura = parse_dt(row.get(get_col(cols, "DATA DE CRIACAO"))) or datetime.now().isoformat()
        data_fechamento = parse_dt(row.get(get_col(cols, "DATA DE CONCLUSAO")))
        if estado_os.get("cancela_os"):
            status_sistema = "cancelada"
        elif estado_os.get("finaliza_os"):
            status_sistema = "fechada"
        else:
            status_sistema = "aberta"
        if status_sistema in {"fechada", "cancelada"} and not data_fechamento:
            data_fechamento = data_abertura

        responsavel_texto = clean(row.get(get_col(cols, "RESPONSAVEL"))) or clean(api.get("responsavel_str"))
        usuario = usuarios_by_norm.get(norm(responsavel_texto))

        automaticas.append(
            {
                "arkmeds_os_id": int(arkmeds_id),
                "arkmeds_cliente_id": int(cliente_legado_id) if cliente_legado_id else None,
                "arkmeds_equipamento_id": int(equipamento_legado_id) if equipamento_legado_id else None,
                "numero": numero_os,
                "numero_original": numero_original if numero_os != numero_original else None,
                "empresa_id": empresa["id"],
                "equipamento_id": equipamento_id,
                "equipamento_modo": equipamento_modo,
                "tipo_os_nome": tipo_os_nome,
                "tipo_os_id": tipo_os["id"],
                "estado_os_nome": estado_nome,
                "estado_os_id": estado_os["id"],
                "tecnico_responsavel_id": usuario.get("id") if usuario else None,
                "solicitante_texto": solicitante_texto or clean(api.get("get_solicitante")),
                "responsavel_texto": responsavel_texto or None,
                "data_abertura": data_abertura,
                "data_fechamento": data_fechamento,
                "problema_relatado": clean(row.get(get_col(cols, "PROBLEMA RELATADO"))) or clean(api.get("problema_str")) or None,
                "origem_problema": clean(row.get(get_col(cols, "ORIGEM DO PROBLEMA"))) or None,
                "descricao_servico": clean(row.get(get_col(cols, "DESCRICAO DO SERVICO"))) or None,
                "observacoes": make_observacoes(
                    row,
                    cols,
                    arkmeds_id,
                    "\n".join(part for part in [motivo_observacao, numero_remapeado_motivo] if part),
                ) or None,
                "prioridade": prioridade(clean(row.get(get_col(cols, "PRIORIDADE")))),
                "status_sistema": status_sistema,
                "ativo": True,
                "historico_observacao": "OS importada do historico Arkmeds.",
            }
        )

        base_revisao["MIGRACAO_STATUS"] = "automatica"
        if cliente_override_observacao:
            base_revisao["MIGRACAO_MOTIVO"] = "; ".join(
                part
                for part in [equipamento_modo, cliente_override_observacao, numero_remapeado_motivo]
                if part
            )
            resumo["automatica_cliente_override"] += 1
        else:
            base_revisao["MIGRACAO_MOTIVO"] = "; ".join(
                part for part in [equipamento_modo, numero_remapeado_motivo] if part
            )
        revisao.append(base_revisao)

    payload = {
        "gerado_em": datetime.now().isoformat(),
        "fonte_planilha": str(PLANILHA_OS.relative_to(ROOT)),
        "fonte_api": str(ARKMEDS_OS.relative_to(ROOT)),
        "ordens_servico": automaticas,
        "equipamentos_historicos": list(equipamentos_historicos.values()),
        "equipamentos_owner_updates": list(equipamentos_owner_updates.values()),
    }

    resumo_dict = dict(resumo)
    resumo_dict.update(
        {
            "total_planilha": int(len(df)),
            "total_payload_os": len(automaticas),
            "total_payload_equipamentos_historicos": len(equipamentos_historicos),
            "total_payload_equipamentos_corrigir_proprietario": len(equipamentos_owner_updates),
            "total_os_numeros_remapeados": len(numeros_remapeados),
            "total_os_numeros_gerados": len(numeros_gerados_sem_numero),
            "numeros_os_remapeados": numeros_remapeados,
            "numeros_os_gerados": numeros_gerados_sem_numero,
            "total_revisao_ou_puladas": int(len(df) - len(automaticas)),
        }
    )

    PAYLOAD_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    RESUMO_PATH.write_text(json.dumps(resumo_dict, ensure_ascii=False, indent=2), encoding="utf-8")

    revisao_df = pd.DataFrame(revisao)
    revisao_path = REVISAO_PATH
    try:
        writer = pd.ExcelWriter(revisao_path, engine="openpyxl")
    except PermissionError:
        revisao_path = OUTPUTS / f"migracao_os_revisao_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        writer = pd.ExcelWriter(revisao_path, engine="openpyxl")

    with writer:
        revisao_df.to_excel(writer, sheet_name="Revisao", index=False)
        pd.DataFrame([resumo_dict]).to_excel(writer, sheet_name="Resumo", index=False)

    resumo_dict["arquivo_revisao"] = str(revisao_path.relative_to(ROOT))
    RESUMO_PATH.write_text(json.dumps(resumo_dict, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(resumo_dict, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
