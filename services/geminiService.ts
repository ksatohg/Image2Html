
import { GoogleGenAI } from "@google/genai";

const BASE_PROMPT = `
あなたはHTMLとインラインCSSを専門とするフロントエンド開発のエキスパートです。

提供されたUIの画像を、インラインスタイル (style属性) を使用したHTMLの断片に変換してください。

以下の要件を厳守してください:
- Tailwind CSSのようなユーティリティクラスは一切使用しないでください。すべてのスタイルは各要素の 'style' 属性に直接記述してください。
- FlexboxやGridをインラインスタイルで活用してレイアウトを構築してください。
- フォームやボタンの背景が白い場合は、ダークモードのエディタでも表示されるように、明示的に 'background-color: #ffffff;' を指定してください。ただし、画像の余白部分には適用しないでください。
- 出力はHTMLの断片のみとし、<html>, <head>, <body> タグは含めないでください。
- scriptタグや<style>ブロックは含めないでください。
- プレースホルダーのテキストは、画像から推測できる場合はそれを使用し、不明な場合は「テキスト入力」や「ボタン」のような一般的なものを使用してください。
`;

export const getAvailableModels = async (): Promise<{ value: string; label: string }[]> => {
  if (!process.env.API_KEY) {
    console.warn("API key is missing.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response: any = await ai.models.list();
    const models = response.models || [];
    
    const filteredModels = models
      .filter((m: any) => 
        m.supportedGenerationMethods && 
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m: any) => {
        const name = m.name.startsWith('models/') ? m.name.substring(7) : m.name;
        return {
          value: name,
          label: m.displayName || name
        };
      })
      .sort((a: any, b: any) => a.label.localeCompare(b.label));

    if (filteredModels.length === 0) {
        return [
            { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
            { label: 'Gemini 3.0 Pro Preview', value: 'gemini-3-pro-preview' },
        ];
    }

    return filteredModels;
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [
        { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
        { label: 'Gemini 3.0 Pro Preview', value: 'gemini-3-pro-preview' },
    ];
  }
};

export const convertImageToHtml = async (
  base64Image: string,
  mimeType: string,
  options: { reproduceColors: boolean; fidelity: number; model: string }
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("APIキーが設定されていません。");
  }

  const { reproduceColors, fidelity, model } = options;
  let finalPrompt = BASE_PROMPT;

  // Add fidelity instruction
  if (fidelity <= 20) {
    finalPrompt += "\n- HTML構造のシンプルさとコードサイズの小ささを最優先してください。大まかなレイアウトと要素の存在が分かれば十分です。細かい装飾（角丸、影など）は無視してください。";
  } else if (fidelity <= 80) {
    finalPrompt += "\n- 再現性とコードのシンプルさのバランスを取ってください。主要なレイアウト、コンポーネント、サイズ感を正確に再現することを重視してください。細かい装飾は省略しても構いません。";
  } else {
    finalPrompt += "\n- 再現性を最優先してください。ピクセルパーフェクトを目指し、レイアウト、サイズ、スペーシング、影、ボーダーなど、あらゆる視覚的な細部に細心の注意を払ってください。複雑なHTML/CSSになっても構いません。";
  }

  // Add color instruction
  if (reproduceColors) {
    finalPrompt += "\n- 配色を忠実に再現してください。";
  } else {
    finalPrompt += "\n- 重要: 色は再現しないでください。白、黒、グレースケールのみを使用してください。元の画像の色は無視し、モノクロで表現してください。";
  }


  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: finalPrompt,
  };

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
    });
    
    let htmlContent = response.text || "";
    if (htmlContent.startsWith('```html')) {
        htmlContent = htmlContent.substring(7);
    } else if (htmlContent.startsWith('```')) {
        htmlContent = htmlContent.substring(3);
    }
    if (htmlContent.endsWith('```')) {
        htmlContent = htmlContent.substring(0, htmlContent.length - 3);
    }

    return htmlContent.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Gemini APIとの通信に失敗しました。");
  }
};

export const refineHtml = async (
  base64Image: string,
  mimeType: string,
  currentHtml: string,
  instruction: string,
  model: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("APIキーが設定されていません。");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
あなたはHTMLとインラインCSSのエキスパートです。
提供された元のUI画像と、現在生成されているHTMLコードを参考に、ユーザーの指示に従ってコードを修正してください。

現在のHTMLコード:
${currentHtml}

ユーザーの修正指示:
${instruction}

要件:
- インラインスタイル (style属性) を修正して、ユーザーの要望を反映させてください。
- 指示に関連しない部分は可能な限り元のコードを維持してください。
- 出力は修正後のHTMLの断片のみとし、説明やマークダウン記法 (例: \`\`\`html) は含めないでください。
`;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: prompt,
  };

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
    });
    
    let htmlContent = response.text || "";
    // Clean up markdown code blocks if present
    if (htmlContent.startsWith('```html')) {
        htmlContent = htmlContent.substring(7);
    } else if (htmlContent.startsWith('```')) {
        htmlContent = htmlContent.substring(3);
    }
    if (htmlContent.endsWith('```')) {
        htmlContent = htmlContent.substring(0, htmlContent.length - 3);
    }

    return htmlContent.trim();
  } catch (error) {
    console.error("Gemini API error during refinement:", error);
    throw new Error("修正の生成に失敗しました。");
  }
};
