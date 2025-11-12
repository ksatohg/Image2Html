
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

export const convertImageToHtml = async (
  base64Image: string,
  mimeType: string,
  options: { reproduceColors: boolean; fidelity: number }
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("APIキーが設定されていません。");
  }

  const { reproduceColors, fidelity } = options;
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
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    
    let htmlContent = response.text;
    if (htmlContent.startsWith('```html')) {
        htmlContent = htmlContent.substring(7);
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
