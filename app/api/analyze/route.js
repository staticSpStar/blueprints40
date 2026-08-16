import OpenAI from "openai";
import { auth } from "@/auth";
import { LEXICON_GROUPS, splitIntoUnits, buildResult, filterUserMessagesByLabel } from "@/lib/scoring";

async function transcribeUserMessages(image) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const buffer = Buffer.from(await image.arrayBuffer());
  const base64 = buffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "이 이미지는 사용자와 AI 챗봇의 대화 캡처입니다. 말풍선 위치·색상 등을 보고 화자를 구분해서, " +
          "오직 사용자(사람)가 입력한 메시지만 순서대로 그대로 옮겨 적으세요. " +
          "AI/챗봇이 응답한 내용은 절대 포함하지 마세요. 설명이나 해석 없이 사용자 메시지만 한 줄에 하나씩 출력하세요.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "이 이미지에서 사용자가 입력한 메시지만 텍스트로 옮겨줘." },
          { type: "image_url", image_url: { url: `data:${image.type};base64,${base64}` } },
        ],
      },
    ],
  });

  return response.choices[0].message.content ?? "";
}

// 화자 라벨이 없는 텍스트에서 사용자 발화만 골라낸다.
// AI 답변이 소제목·목록 등 여러 문단에 걸쳐 있으면 "빈 줄/줄바꿈 교대" 같은 로컬 규칙으로는
// 전혀 구분이 안 되므로(테스트로 확인됨), 실제 문장 내용을 이해하는 모델에 맡긴다.
async function extractUserMessagesWithAI(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "다음은 사용자와 AI 챗봇 사이의 대화를 그대로 복사한 텍스트입니다. 이 중에서 오직 " +
          "사용자(사람)가 입력한 메시지만 순서대로 골라내세요. AI가 응답한 설명, 목록, 추천 등은 " +
          "절대 포함하지 마세요. 사용자 메시지를 원문 그대로(고치거나 요약하지 말고) 한 줄에 " +
          "하나씩만 출력하고, 그 외의 문구는 출력하지 마세요.",
      },
      { role: "user", content: text },
    ],
  });

  return response.choices[0].message.content ?? "";
}

// 2. 어휘군과 "의미가 비슷한" 단위를 찾는다. 표현이 달라도(반말/구어체/오타 등)
// 의도가 같으면 매칭되도록, 예시 문구를 기준으로 삼아 OpenAI가 직접 판단하게 한다.
async function classifyUnits(units) {
  if (units.length === 0) return [];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const guide = LEXICON_GROUPS.map(
    (g) => `${g.level}단계 (${g.label}, 가중치 ${g.weight}): ${g.phrases.join(" / ")}`
  ).join("\n");
  const numbered = units.map((u, i) => `${i}: ${u}`).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "너는 사용자가 AI에게 얼마나 의존적으로 말하는지 분류하는 채점자다. 아래는 단계별 예시 문구다:\n\n" +
          guide +
          "\n\n입력으로 번호가 매겨진 문장 목록이 주어진다. 각 문장이 예시 문구와 표현은 달라도 " +
          "의미·의도가 비슷하면 해당 단계로 분류하라(반말, 구어체, 오타, 어순 차이는 무시). " +
          "세 단계 모두 예시 문구와 정확히 일치하지 않아도 폭넓게 잡되, 아래 기준으로 서로 " +
          "구분하라 — 세 단계를 다 후보로 볼 수 있는 애매한 문장이라도 무조건 1단계로 올리지 " +
          "말고, 실제로 무엇을 요구했는지에 따라 가장 맞는 단계 하나만 골라라.\n\n" +
          "1단계: 사용자가 결과물이나 결정 자체를 AI에게 통째로 넘기는 경우만 해당한다 " +
          "(예: 대본/답장/계획을 그대로 써달라, 여러 선택지 중 하나를 AI가 대신 확정해서 골라달라, " +
          "'그냥 네가 하나로 딱 정해줘'처럼 최종 선택권 자체를 넘기는 경우). 단순히 '추천해줘', " +
          "'알려줘'처럼 정보나 의견을 구하는 것은 결과물을 통째로 넘긴 게 아니므로 1단계가 아니다.\n" +
          "2단계: 사용자가 이미 어느 정도 방향이나 생각을 갖고 있고, 그것에 대한 확인·동의·판단을 " +
          "구하는 경우다 (예: 이거 괜찮아?, 이렇게 해도 될까?, 네 생각은 어때?, 이 선택 어떤 것 같아?).\n" +
          "3단계: 방향을 정하지 않은 채 일반적인 도움/정보/추천을 구하는 경우다 (예: 추천해줘, " +
          "알려줘, 도와줘, 뭐가 좋을까?, 어떻게 생각해?).\n\n" +
          "정말로 AI에게 아무것도 묻거나 요청하지 않는 순수한 진술·감정 표현만 0으로 분류하라. " +
          "모든 문장에 대해 빠짐없이 답하라.",
      },
      { role: "user", content: numbered },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "unit_classification",
        schema: {
          type: "object",
          properties: {
            classifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  level: { type: "integer", enum: [0, 1, 2, 3] },
                },
                required: ["index", "level"],
                additionalProperties: false,
              },
            },
          },
          required: ["classifications"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const levels = new Array(units.length).fill(0);
  for (const { index, level } of parsed.classifications) {
    if (index >= 0 && index < levels.length) levels[index] = level;
  }
  return levels;
}

export async function POST(req) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await req.formData();
  const text = formData.get("text") || "";
  const image = formData.get("image");

  let imageText = "";
  if (image && typeof image !== "string") {
    imageText = await transcribeUserMessages(image);
  }

  // 화자 표시("나:"/"AI:")가 있으면 그걸로 정확히 거르고, 없으면 OpenAI에게 맡긴다.
  // 이미지 쪽은 transcribeUserMessages 단계에서 이미 사용자 메시지만 추출된 상태다.
  let userText = "";
  if (text.trim()) {
    const byLabel = filterUserMessagesByLabel(text);
    userText = byLabel !== null ? byLabel : await extractUserMessagesWithAI(text);
  }

  const combinedText = [userText, imageText].filter(Boolean).join("\n");
  if (!combinedText.trim()) {
    return Response.json({ error: "분석할 내용이 없습니다." }, { status: 400 });
  }

  const units = splitIntoUnits(combinedText);
  const levels = await classifyUnits(units);
  const result = buildResult(units, levels);
  return Response.json(result);
}
