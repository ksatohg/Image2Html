
import { GoogleGenAI } from "@google/genai";

const PROMPT = `
あなたはHTMLとインラインCSSを専門とするフロントエンド開発のエキスパートです。

提供されたUIの画像を、インラインスタイル (style属性) を使用したHTMLの断片に変換してください。

以下の要件を厳守してください:
- Tailwind CSSのようなユーティリティクラスは一切使用しないでください。すべてのスタイルは各要素の 'style' 属性に直接記述してください。
- レイアウト、サイズ、配色など、元の画像を忠実に再現してください。FlexboxやGridをインラインスタイルで活用してレイアウトを構築してください。
- フォームやボタンの背景が白い場合は、ダークモードのエディタでも表示されるように、明示的に 'background-color: #ffffff;' を指定してください。ただし、画像の余白部分には適用しないでください。
- HTMLは構造的にシンプルにしてください。角の丸みや影のような細かい装飾を再現するために複雑なコードになることは避けてください。各コントロールの配置とサイズ感を再現することが最も重要です。
- 出力はHTMLの断片のみとし、<html>, <head>, <body> タグは含めないでください。
- scriptタグや<style>ブロックは含めないでください。
- プレースホルダーのテキストは、画像から推測できる場合はそれを使用し、不明な場合は「テキスト入力」や「ボタン」のような一般的なものを使用してください。
`;

export const convertImageToHtml = async (base64Image: string, mimeType: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("APIキーが設定されていません。");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: PROMPT,
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
