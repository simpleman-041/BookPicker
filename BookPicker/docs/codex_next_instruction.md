今回はYondokuをRender Web Serviceで安全に起動できるよう、
Render向けの実行設定を追加してください。

現在、

Docker
Demo Mode
Demo SQLite
Migration
Demo Seed 7冊
Demo専用表紙
Rate Limiting
HTTP request body size制限
Magic Bytes検証
XSS監査
表紙ファイル操作監査

まで完了しています。

今回はRenderへの実デプロイ前の最終ランタイム対応です。

まだRender Dashboard上でサービスを作成しないでください。


最初に以下を確認してください。

BookPicker/Program.cs
Dockerfile
appsettings.json
appsettings.Development.json
現在のKestrel待受ポート
UseHttpsRedirectionの位置
Rate LimitingのIP partition方法
YONDOKU_DEMO_MODE
現在のMiddleware順序


1. RenderのPORT環境変数へ対応する

Render Web Serviceでは、
PORT環境変数で指定されたポートを使用してください。

RenderではPORTの既定値は10000です。

PORTが存在する場合、

0.0.0.0

でそのポートをListenするようにしてください。

Render以外のローカルDockerでは、
現在の8080動作を維持してください。

現在の設計に最も自然な方法を選択してください。

Program.cs
Dockerfile
ASP.NET CoreのURL設定

のどこで対応するのが適切か確認し、
必要最小限の変更にしてください。


2. Render環境を判定する

Renderが自動設定する

RENDER=true

を利用して、
Render上で動いているか判断して構いません。

ただし既存の

YONDOKU_DEMO_MODE=true

とは役割を分けてください。

RENDER
ホスティング環境判定

YONDOKU_DEMO_MODE
デモ用DBやSeedの動作判定

という責務を維持してください。


3. HTTPS RedirectをRender構成に合わせる

Renderは外部HTTPSを終端し、
HTTPアクセスをRender側でHTTPSへリダイレクトします。

ContainerへはHTTPで転送されます。

そのためRender環境でUseHttpsRedirectionが
不要なリダイレクトやHTTPSポート警告を発生させないようにしてください。

ローカルVisual Studioでの既存HTTPS開発動作は壊さないでください。

Render環境だけに必要な条件分岐を行う場合は、
理由が明確になるようにしてください。


4. Forwarded Headersを無条件に信用しない

今回の段階では、

KnownProxies
KnownNetworks

を無条件にClearして、
すべてのX-Forwarded-ForやX-Forwarded-Protoを信用する設定にはしないでください。

ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

を安易に追加しないでください。

Renderの実際のProxy情報を確認する前に、
IP spoofingにつながる設定を導入しないでください。


5. Rate Limiting

現在Rate LimitingはRemoteIpAddressなどを利用して
IPごとにpartitionしているはずです。

Render初回デプロイ前の段階では、
Forwarded Headersを安全に処理する方法が確定していない場合、
現在の安全な挙動を維持してください。

Render上では複数利用者が同じProxy IPとして認識される可能性があることを、
残課題として明確に報告してください。

この問題を解決するために、
未確認のX-Forwarded-For値を独自に信用しないでください。


6. ローカルRender相当確認

最新Docker Imageをbuildしてください。

可能であればローカルContainerを、

PORT=10000
RENDER=true
YONDOKU_DEMO_MODE=true

として起動してください。

ホスト側から10000番ポートへmappingし、

http://localhost:10000

で正常にアクセスできることを確認してください。


確認項目

トップページ HTTP 200
GET /api/books HTTP 200
Demo Seed 7冊
Demo専用表紙
検索
Rate Limiting
表紙アップロード

が既存どおり動作すること。


7. 通常Docker動作も維持する

RENDERが設定されていない通常Docker環境では、
現在の8080番ポート動作を壊さないでください。


8. Render用秘密情報は追加しない

APIキー
パスワード
秘密値

は今回必要ありません。

Render用秘密情報をリポジトリへ追加しないでください。


9. render.yaml

今回の段階では、
render.yamlを必須にはしないでください。

Render Dashboardから最初のデプロイを行う予定です。

Blueprint化が有益と判断しても、
今回は提案だけに留めてください。


10. 既存機能を変更しない

Bookドメイン
API仕様
UI
Demo Seed内容
画像
Rate Limit値
request body制限
Magic Bytes
XSS関連
ファイル削除仕様

には変更を加えないでください。


11. 検証

dotnet build
dotnet test

を実行してください。

Docker Imageをbuildし、
Render相当環境変数でContainerを起動して確認してください。


作業完了後に以下を報告してください。

変更したファイル
PORTへの対応方法
RENDER環境判定方法
Render環境でのHTTPS Redirectの扱い
ローカル環境への影響
Forwarded Headersを今回どう扱ったか
Rate LimitingのRender上の残課題
使用したdocker buildコマンド
使用したdocker runコマンド
PORT=10000での起動結果
トップページ確認結果
GET /api/books確認結果
全テスト結果
Renderへ実デプロイする前に残っている課題

ここまで完了したら停止してください。