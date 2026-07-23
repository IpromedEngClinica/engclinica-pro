import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const tecnicos = [
  {
    nome: "Cleiton de Souza",
    email: "cleitondesouzajf@hotmail.com",
    senha: "TecCleiton@2026",
    responsaveisOs: ["Cleiton de Souza"],
  },
  {
    nome: "Ricardo de Rezende Rocha",
    email: "rickrerocha@hotmail.com",
    senha: "TecRicardo@2026",
    responsaveisOs: ["Ricardo de Rezende Rocha"],
  },
  {
    nome: "Luciano Augusto Valentim",
    email: "luvalentimjf@gmail.com",
    senha: "TecLuciano@2026",
    responsaveisOs: ["Luciano Augusto Valentim"],
  },
  {
    nome: "Emílio Flávio do Nascimento",
    email: "emilioflavio67@gmail.com",
    senha: "TecEmilio@2026",
    responsaveisOs: ["Emílio Flávio do Nascimento"],
  },
  {
    nome: "Raphael Cardoso da Silva",
    email: "raphaelaci@yahoo.com",
    senha: "TecRaphael@2026",
    responsaveisOs: ["Raphael Cardoso da Silva"],
  },
  {
    nome: "Phillipe Martins Silva",
    email: "phillipem83@gmail.com",
    senha: "TecPhillipe@2026",
    responsaveisOs: ["Phillipe Martins Silva"],
  },
  {
    nome: "Luis Macedo",
    email: "luis.macedo@ipromed.local",
    senha: "TecLuis@2026",
    responsaveisOs: ["Luis Macedo", "Luís Macedo"],
  },
];

const getSomenteNome = () => {
  const index = process.argv.indexOf("--somente");
  return index >= 0 ? process.argv[index + 1]?.trim() || "" : "";
};

const normalizarEmail = (email) => email.trim().toLowerCase();

const listarAuthUsers = async () => {
  const users = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw new Error(error.message);

    users.push(...(data?.users || []));

    if (!data?.users?.length || data.users.length < perPage) break;
  }

  return users;
};

const criarOuAtualizarAuthUser = async (tecnico, authUsers) => {
  const email = normalizarEmail(tecnico.email);
  const existente = authUsers.find((user) => normalizarEmail(user.email || "") === email);

  if (existente) {
    const { data, error } = await supabase.auth.admin.updateUserById(existente.id, {
      password: tecnico.senha,
      email_confirm: true,
      user_metadata: {
        ...(existente.user_metadata || {}),
        nome: tecnico.nome,
        perfil: "tecnico",
      },
    });

    if (error) throw new Error(error.message);

    return {
      authUserId: data.user.id,
      authStatus: "atualizado",
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tecnico.senha,
    email_confirm: true,
    user_metadata: {
      nome: tecnico.nome,
      perfil: "tecnico",
    },
  });

  if (error) throw new Error(error.message);

  return {
    authUserId: data.user.id,
    authStatus: "criado",
  };
};

const buscarOrganizacao = async () => {
  const { data, error } = await supabase
    .from("organizacoes")
    .select("id, nome")
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Nenhuma organizacao ativa encontrada.");

  return data;
};

const upsertUsuario = async (tecnico, organizacaoId, authUserId) => {
  const payload = {
    id: authUserId,
    organizacao_id: organizacaoId,
    nome: tecnico.nome,
    email: normalizarEmail(tecnico.email),
    perfil: "tecnico",
    empresa_id: null,
    ativo: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("usuarios")
    .upsert(payload, { onConflict: "id" })
    .select("id, nome, email, perfil, ativo")
    .single();

  if (error) throw new Error(error.message);

  return data;
};

const vincularOrdensServico = async (tecnico, usuarioId) => {
  const ids = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("id, tecnico_responsavel_id")
      .in("responsavel_texto", tecnico.responsaveisOs)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    ids.push(
      ...((data || [])
        .filter((ordemServico) => ordemServico.tecnico_responsavel_id !== usuarioId)
        .map((ordemServico) => ordemServico.id))
    );

    if (!data || data.length < pageSize) break;
  }

  const chunkSize = 150;
  let atualizadas = 0;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const { error } = await supabase
      .from("ordens_servico")
      .update({ tecnico_responsavel_id: usuarioId })
      .in("id", chunk);

    if (error) throw new Error(error.message);

    atualizadas += chunk.length;
  }

  return atualizadas;
};

const validarVinculos = async (usuariosIds) => {
  const validacao = [];

  for (const usuarioId of usuariosIds) {
    const { count, error } = await supabase
      .from("ordens_servico")
      .select("id", { count: "exact", head: true })
      .eq("tecnico_responsavel_id", usuarioId);

    if (error) throw new Error(error.message);

    validacao.push({
      usuarioId,
      ordensServicoVinculadas: count || 0,
    });
  }

  return validacao;
};

const main = async () => {
  const organizacao = await buscarOrganizacao();
  const authUsers = await listarAuthUsers();
  const resultado = [];
  const somenteNome = getSomenteNome();
  const tecnicosSelecionados = somenteNome
    ? tecnicos.filter(
        (tecnico) =>
          tecnico.nome.localeCompare(somenteNome, "pt-BR", {
            sensitivity: "base",
          }) === 0
      )
    : tecnicos;

  if (somenteNome && tecnicosSelecionados.length === 0) {
    throw new Error(`Tecnico nao encontrado no script: ${somenteNome}`);
  }

  for (const tecnico of tecnicosSelecionados) {
    const auth = await criarOuAtualizarAuthUser(tecnico, authUsers);
    const usuario = await upsertUsuario(tecnico, organizacao.id, auth.authUserId);
    const ordensServicoVinculadas = await vincularOrdensServico(tecnico, usuario.id);

    resultado.push({
      nome: tecnico.nome,
      email: normalizarEmail(tecnico.email),
      senha: tecnico.senha,
      authStatus: auth.authStatus,
      usuarioId: usuario.id,
      perfil: usuario.perfil,
      ordensServicoVinculadas,
    });
  }

  const validacao = await validarVinculos(resultado.map((item) => item.usuarioId));
  const payload = {
    executadoEm: new Date().toISOString(),
    organizacao,
    tecnicos: resultado.map((item) => ({
      ...item,
      totalOrdensServicoVinculadasAgora: validacao.find(
        (validado) => validado.usuarioId === item.usuarioId
      )?.ordensServicoVinculadas || 0,
    })),
  };

  await writeFile(
    "outputs/cadastro_forcado_tecnicos_resultado.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );

  console.log(JSON.stringify(payload, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
