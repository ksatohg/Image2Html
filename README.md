<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1V4V3EIKiJ-sDocZ7sw0iIkwwy4yoDzpU

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 使い方
※ 1～3は初回起動だけ  
1. Google AI Studio（https://aistudio.google.com/）でAPIキーを発行する
   - 左下「Get API key」
   - 右上「APIキーを作成」
   - 新しいキーを作成から、「キー名の設定」を適当（例：Image2Html）に入力
   - インポートしたプロジェクトを選択から、「プロジェクトを作成」を選択、プロジェクトに適当な名前（例：Image2Html）を付ける
   - 「キーを作成」ボタンで作成、APIキーをコピーしておく
2. このディレクトリをコンソールで開き、
   ```npm install```
3. このディレクトリの「.env.local」を編集、GEMINI_API_KEYにAPIをペースト
4. 「■Image2Htmlを起動.bat」を実行
   
