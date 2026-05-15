import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { cnpj: string } }
) {
  const digits = params.cnpj.replace(/\D/g, "");

  if (digits.length !== 14) {
    return NextResponse.json(
      { error: true, message: "CNPJ inválido" },
      { status: 400 }
    );
  }

  const url = `https://brasilapi.com.br/api/cnpj/v1/${digits}`;
  console.log("CNPJ route — chamando URL:", url);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });

    console.log("CNPJ route — status da resposta:", res.status);

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: true, message: "CNPJ não encontrado" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: true, message: "Serviço temporariamente indisponível" },
        { status: 503 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.log("Erro detalhado:", error);
    return NextResponse.json(
      { error: true, message: "Serviço temporariamente indisponível" },
      { status: 503 }
    );
  }
}
