# Gera data/catalogo.json a partir da lista da secao 5.3 do prompt v2.
# Uso unico (ponto de partida). Depois disso, edite direto o data/catalogo.json.
import json, re, unicodedata, pathlib

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# (nome, duracao, detalhe-do-material-ou-None, palavras-de-busca)
C = [
 ("sobrancelhas", "Sobrancelhas", True, [
  ("Avaliação com tricoscopia", "1h", None, "avaliacao sobrancelha falhada"),
  ("Design Therapy", "40min", None, "design"),
  ("Lamination Therapy", "1h", None, "laminacao brow lamination"),
  ("Pós Lamination Therapy", "30min", None, "manutencao laminacao"),
  ("Nanofios Brows", "2h", "Evolução da micropigmentação, com durabilidade de até 8 meses.", "micropigmentacao fio a fio"),
 ]),
 ("estetica-facial", "Estética facial", True, [
  ("Avaliação/Anamnese facial", "1h", None, "avaliacao rosto pele"),
  ("Toxina botulínica", "1h30", None, "botox rugas"),
  ("Skinbooster facial", "1h30", None, "hidratacao profunda"),
  ("Microagulhamento com ativos", "1h30", None, "microagulhamento"),
  ("Bioestimulador de colágeno", "1h30", None, "colageno flacidez"),
  ("Lifting não cirúrgico", "2h", None, "flacidez"),
  ("Lifting não cirúrgico por área", "1h30", None, "flacidez"),
  ("Aplicação de ácido hialurônico", "1h30", None, "preenchimento hialuronico"),
  ("Preenchimento de sulcos", "1h", None, "bigode chines"),
  ("Enzimas faciais / papada", "1h30", None, "papada gordura"),
  ("Enzima papada", "1h", None, "papada"),
  ("Hidratação ou nutrição facial", "1h", None, "pele seca"),
  ("Revitalização de pescoço", "1h", None, "pescoco colo"),
  ("Tratamento para olheiras", "40min", None, "olheira olhos"),
  ("Tratamento de melasma", "1h", None, "manchas melasma"),
  ("Rádio", "1h", None, "radiofrequencia"),
  ("Cauterização de pintas", "1h", None, "pinta"),
  ("Retorno de cauterização de pintas", "1h", None, "retorno"),
  ("Cauterização de verrugas", "1h", None, "verruga"),
  ("Cauterização de acne", "2h", None, "espinha acne"),
  ("Retirada de seringomas", "1h", None, "seringoma"),
  ("Retorno botox", "1h", None, "retorno toxina"),
 ]),
 ("limpeza-de-pele", "Limpeza de pele", False, [
  ("Limpeza Glow", "1h30", None, "limpeza"),
  ("Limpeza Essencial", "1h30", None, "limpeza"),
  ("Limpeza com peeling", "1h30", None, "peeling"),
  ("Limpeza de costas", "1h30", None, "costas acne"),
  ("Limpeza de pele íntima", "1h30", None, "intima virilha"),
  ("Retorno de limpeza de pele", "1h", None, "retorno"),
 ]),
 ("cilios-e-labios", "Cílios e lábios", False, [
  ("Lash Therapy", "1h30", None, "cilios lash lifting"),
  ("Hidragloss", "1h", None, "labios hidratacao"),
  ("Micropigmentação labial", "1h", None, "boca labios cor"),
  ("Preenchimento labial", "1h", None, "boca labios volume"),
  ("Spa labial", "10min", None, "labios"),
 ]),
 ("saude-integrativa", "Saúde integrativa", True, [
  ("Avaliação integrativa", "30min", None, "avaliacao ozonio dor"),
  ("Avaliação de ozonioterapia", "1h", None, "ozonio avaliacao"),
  ("Laserterapia / ILIB", "1h", None, "laser ilib"),
  ("Autohemoterapia ozonizada", "30min", None, "ozonio"),
  ("Tratamento para dor", "1h", "Joelho, coluna e ombros.", "dor ombro joelho coluna costas tendao"),
  ("Tratamento para cefaleia", "1h", None, "dor de cabeca enxaqueca"),
  ("Tratamento para imunidade", "1h", None, "imunidade"),
  ("Tratamento intestinal", "30min", None, "intestino"),
  ("Sinergia celular / aromaterapia", "1h", None, "aromaterapia oleos essenciais"),
  ("Tratamento respiratório", "40min", None, "respiracao"),
  ("Tratamento de cicatrizes", "45min", None, "cicatriz"),
  ("Tratamento de fibrose", "45min", None, "fibrose pos operatorio"),
  ("Tratamento de microvasos", "1h", None, "vasinhos varizes"),
  ("Tratamento de feridas", "1h30", None, "ferida"),
  ("Tratamento de furúnculo", "1h", None, "furunculo"),
  ("Tratamento para unhas", "1h", "Lesão, micose e dor.", "unha micose"),
  ("Tratamento para pele", "1h", "Psoríase, dermatite e alergias.", "psoriase dermatite alergia"),
  ("Biorressonância", "1h", None, "biorressonancia"),
 ]),
 ("massagem-e-drenagem", "Massagem e drenagem", False, [
  ("Drenagem Método Renata França", "1h30", None, "drenagem inchaco"),
  ("Drenagem linfática manual", "1h30", None, "drenagem inchaco"),
  ("Drenagem linfática facial", "50min", None, "drenagem rosto"),
  ("Drenagem para gestantes", "1h", None, "gravida gestante"),
  ("Drenagem pós-operatória", "1h30", None, "pos operatorio cirurgia"),
  ("Drenagem facial pós-operatória", "1h30", None, "pos operatorio rosto"),
  ("Massagem relaxante", "1h20", None, "relaxar estresse"),
  ("Massagem terapêutica", "1h20", None, "tensao dor muscular"),
  ("Massagem com pedras quentes", "1h20", None, "pedras"),
  ("Massagem relaxante com pedras", "1h30", None, "pedras"),
  ("Shiatsu", "1h20", None, "shiatsu"),
  ("Massagem facial", "40min", None, "rosto"),
  ("Ventosaterapia", "1h30", None, "ventosa"),
  ("Aplicação de ventosa", "40min", None, "ventosa"),
  ("Massagem terapêutica + ventosaterapia", "1h30", None, "ventosa"),
  ("Reflexologia podal", "50min", None, "pes"),
  ("Quick massage", "30min", None, "rapida"),
 ]),
 ("regeneracao-capilar", "Regeneração capilar", False, [
  ("Rebrow Therapy", "40min", "Regeneração de sobrancelhas com exossomos e PDRN.", "sobrancelha falhada rala"),
  ("Terapia capilar", "1h", None, "cabelo queda"),
  ("Tratamento para crescimento de barba", "45min", None, "barba"),
 ]),
 ("corpo-e-fit-glow", "Corpo e Fit Glow", True, [
  ("Glow Purify", "1h30", "Protocolo voltado a detox e inchaço.", "detox inchaco"),
  ("Glow Slim", "1h", "Protocolo para gordura localizada com ozonioterapia.", "gordura localizada emagrecer"),
  ("Avaliação corporal", "1h", None, "avaliacao corpo"),
  ("Enzimas corporais", "1h30", "Para gordura localizada, flacidez e celulite.", "gordura celulite flacidez"),
  ("Enzimas para flacidez", "1h", None, "flacidez"),
  ("Tratamento para estrias", "1h", None, "estria"),
  ("Peeling para estrias", "1h30", None, "estria"),
  ("Clareamento de manchas", "1h30", None, "mancha"),
  ("Clareamento de axilas", "1h", None, "axila mancha"),
  ("Esfoliação corporal", "1h", None, "esfoliacao"),
  ("Up glúteo", "1h30", None, "gluteo bumbum"),
 ]),
 ("depilacao", "Depilação", False, [
  ("Axilas", "30min", None, "depilacao axila"),
  ("Abdômen", "30min", None, "depilacao barriga"),
  ("Braços", "30min", None, "depilacao"),
  ("Buço", "20min", None, "depilacao"),
  ("Nariz", "20min", None, "depilacao"),
  ("Orelha", "20min", None, "depilacao"),
  ("Queixo", "30min", None, "depilacao"),
  ("Rosto", "30min", None, "depilacao"),
  ("Nádegas", "30min", None, "depilacao"),
  ("Meia perna", "30min", None, "depilacao"),
  ("Perna inteira", "30min", None, "depilacao"),
  ("Virilha completa", "1h", None, "depilacao"),
  ("Higiênica", "30min", None, "depilacao virilha"),
  ("Costas", "2h", None, "depilacao"),
  ("Combo meia perna + virilha", "1h", None, "depilacao combo"),
  ("Combo meia perna + virilha + axila", "1h30", None, "depilacao combo"),
  ("Combo perna inteira + virilha", "1h", None, "depilacao combo"),
  ("Combo perna inteira + virilha + axila", "1h30", None, "depilacao combo"),
  ("Combo virilha + axila", "1h", None, "depilacao combo"),
  ("Combo virilha + axila + buço", "1h30", None, "depilacao combo"),
 ]),
]

cats = []
for cid, nome, aval, itens in C:
    cats.append({
        "id": cid, "nome": nome, "comeca_por_avaliacao": aval,
        "itens": [{"id": f"{cid}--{slug(n)}", "nome": n, "duracao": d,
                   **({"detalhe": det} if det else {}), "busca": b} for n, d, det, b in itens]})

out = {
  "_leia": "Fonte unica do catalogo: o site e a Dara leem este arquivo. Sem precos. 'detalhe' so com texto do material da clinica.",
  "atualizado_em": "2026-10-30",
  "categorias": cats,
}
p = pathlib.Path(__file__).resolve().parent.parent / "data" / "catalogo.json"
p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
ids = [i["id"] for c in cats for i in c["itens"]]
assert len(ids) == len(set(ids)), "id repetido"
print(len(cats), "categorias,", len(ids), "itens")
for c in cats:
    print(f'  {c["nome"]}: {len(c["itens"])}')
