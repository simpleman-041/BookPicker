今回はYondoku公開デモのセキュリティ対策として、
フロントエンドを中心にXSSリスクを監査し、
実際に危険な箇所がある場合のみ必要最小限の修正をしてください。

現在、

Rate Limiting
HTTP request body size制限
IFormFile 5MiB制限
拡張子検証
Content-Type検証
Magic Bytes検証

まで実装、検証済みです。

今回はXSS監査だけを扱ってください。

Render対応やその他のセキュリティ工程にはまだ進まないでください。


最初に以下を確認してください。

BookPicker/wwwroot/js/app.js
BookPicker/wwwroot/index.html
BookPicker/wwwroot/css/style.css

BooksController
Bookモデル
Requestモデル
APIからフロントへ返されるデータ

現在ユーザーが入力できる全項目

タイトル検索
Bookタイトル
その他自由入力可能な値
表紙関連パスやURL
APIエラーメッセージ


1. DOMへの文字列挿入箇所を全て監査する

app.jsを中心に、以下の利用箇所を検索してください。

innerHTML
outerHTML
insertAdjacentHTML
document.write
テンプレート文字列を使ったHTML生成
setAttribute
href
src
style
その他DOMへ文字列を直接挿入する処理

単に検索するだけでなく、
その値がどこから来ているのかまで追跡してください。


2. ユーザー入力またはAPIデータをHTMLとして解釈しない

Bookタイトル
検索文字列
エラーメッセージ
その他ユーザー由来の文字列

を表示する場合は、

textContent
createTextNode
安全なDOM API

などを優先してください。

ユーザー由来文字列をinnerHTMLへ直接渡さないでください。


3. innerHTMLを一律禁止しない

現在innerHTMLを使用していても、
完全に固定された開発者側HTMLだけを設定している場合は、
必ずしも変更する必要はありません。

重要なのは、

ユーザー入力
APIから返された可変文字列

がHTMLとして解釈されないことです。

不要な大規模リファクタリングは避けてください。


4. HTML sanitizerを安易に追加しない

現在のYondokuでは、
ユーザーへHTML入力を許可する仕様はありません。

そのためDOMPurifyなどの外部sanitizerを追加する前に、

そもそもHTMLとして挿入せず、
textContentなどで扱えるか

を優先してください。

外部ライブラリを追加する必要がある場合は、
先に理由を明確にしてください。


5. 属性値も確認する

文字本文だけでなく、

src
href
data属性
style

などへユーザー制御可能な値が入っていないか確認してください。

特にCoverImagePathなどについて、
現在どの値が入り得るか確認してください。

危険なjavascript URLなどが実行可能な経路がないか監査してください。

ただし今回の目的から外れる大きなURL仕様変更は行わず、
問題がある場合は報告してください。


6. 悪意ある入力を想定する

少なくとも以下のような値を想定してください。

<script>alert(1)</script>

<img src=x onerror=alert(1)>

"><svg onload=alert(1)>

通常のHTMLタグ文字列

引用符
山括弧
アンパサンド

これらが登録可能かどうかに関係なく、
フロントエンド側が安全に文字列として扱う設計か確認してください。

バックエンドの入力検証だけをXSS対策として頼らないでください。


7. タイトル検索も確認する

検索欄へ入力した値が、

検索結果
エラー表示
条件表示
その他UI

へ戻される経路がある場合、
HTMLとして解釈されないことを確認してください。

前工程で修正した検索状態同期の挙動は壊さないでください。


8. APIレスポンスとエラー表示

サーバーから返されたエラー文字列を、
innerHTMLなどへ直接入れていないか確認してください。

APIから返る文字列についても、
信頼済みHTMLとして扱わないでください。


9. テストまたは検証

可能な範囲で、
悪意ある文字列をDOMへ渡した場合にコードとして実行されず、
文字列として扱われることを確認してください。

既存構造でフロントエンド自動テストが難しい場合は、
コード監査結果と確認方法を明確に報告してください。

JavaScript構文確認も実施してください。


10. 既存機能を維持する

以下を壊さないでください。

タイトル検索
部分一致
完全一致
詳細フィルター
クイック条件
お気に入り
Book追加
Book編集
Book削除
進捗更新
読了
表紙アップロード
ヘルプ
Demo Mode
Rate Limiting
request body size制限
Magic Bytes検証


11. 既存バックエンドテスト

dotnet build
dotnet test

を実行し、
全既存テストを維持してください。


12. Docker確認

必要なコード変更があった場合は、
最新Docker Imageをbuildし、

YONDOKU_DEMO_MODE=true

でContainerを起動してください。

トップページ
GET /api/books
Demo Seed 7冊

が正常であることを確認してください。


13. 今回変更しないもの

Rate Limit値
request body size値
画像アップロード仕様
Demo Seed内容
デモ用表紙
Forwarded Headers
HTTPS
Render設定
認証
Persistent Volume
UIデザイン

には進まないでください。


作業完了後に以下を報告してください。

監査したファイル
innerHTMLなどの使用箇所
ユーザー入力がDOMへ到達する経路
危険だった箇所
修正した箇所
修正不要と判断した箇所と理由
Bookタイトルの安全性
検索文字列の安全性
エラーメッセージ表示の安全性
CoverImagePathなど属性値の監査結果
外部ライブラリ追加の有無
JavaScript構文確認結果
dotnet build結果
全テスト結果
Docker確認結果
今後対応すべきXSS関連課題が残っているか

ここまで完了したら停止してください。