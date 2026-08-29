今回はYondoku公開デモの公開前セキュリティ確認として、
表紙画像の保存、置換、削除に関するファイル操作を最終監査してください。

現在、

Rate Limiting
HTTP request body size制限
IFormFile 5MiB制限
拡張子検証
Content-Type検証
Magic Bytes検証
XSS監査

まで完了しています。

XSS監査では追加修正不要という結果でした。

今回は表紙画像のファイル操作だけを対象としてください。

Render対応、Demo Seedの表紙追加、UI変更などにはまだ進まないでください。


最初に以下を確認してください。

BookPicker/Controllers/BooksController.cs
表紙アップロードendpoint
Book削除endpoint
表紙置換処理
CoverImagePath更新処理
古い表紙ファイル削除処理
wwwroot/uploads/covers
default coverの扱い
外部URLの扱い
関連テスト


1. 表紙置換時の処理順序を監査する

新しい表紙へ変更するとき、

新しいファイル保存
DBのCoverImagePath更新
SaveChanges
古いアップロードファイル削除

などがどの順番で行われているか確認してください。

DB更新が失敗したことで、
有効な古い表紙を先に失う構成になっていないか確認してください。

基本的には、
DBの新しい状態が正常に確定する前に、
現在有効な古い表紙を破壊しない設計を優先してください。


2. 古いファイル削除失敗時の扱い

DB更新には成功したが、
古い表紙ファイルの物理削除だけ失敗した場合について確認してください。

このケースで、

新しく保存した表紙
正常に更新済みのDB

まで不用意に巻き戻して、
利用可能な状態を壊さないでください。

必要であれば削除失敗をログへ残し、
孤立ファイルが残る方を、
DBと表紙参照が壊れる状態より優先してください。

現在の設計がすでに安全なら変更不要です。


3. Book削除時の表紙削除

Bookそのものを削除した場合に、
Yondokuがアップロードした表紙ファイルが適切に削除されるか確認してください。

ただし物理ファイル削除失敗によって、
DB削除処理そのものが危険な中途半端状態にならないよう、
処理順序と例外処理を確認してください。


4. 削除してよいファイルを厳密に限定する

物理削除の対象は原則として、

wwwroot/uploads/covers

配下に存在する、
Yondoku自身がアップロードしたローカル表紙だけにしてください。

以下は削除してはいけません。

default cover
wwwroot/images以下などアプリ付属の静的画像
外部https URL
uploads/covers外のファイル
不正な相対パス
親ディレクトリを参照するパス


5. Path Traversalを再確認する

CoverImagePathなどの値から、
削除対象の物理パスを生成する処理を確認してください。

例えば、

../
..\

などによってuploads/covers外へ脱出できないことを確認してください。

Path.GetFullPathなど現在の.NET標準APIを適切に利用し、
最終的な物理パスが許可ディレクトリ内部に存在することを確認してください。

文字列の単純なStartsWithだけで危険な判定になっていないかも確認してください。

WindowsとLinuxのパス差も考慮してください。

RenderではLinux Containerで動作する予定です。


6. ファイル名を信用しない

現在GUIDなどの安全なサーバー生成ファイル名を利用している方針を維持してください。

アップロード元のユーザーファイル名を、
物理保存先ファイル名として直接使用しないでください。


7. 新規表紙保存失敗時

新しい表紙ファイルの保存自体に失敗した場合、
DBのCoverImagePathだけが新しい存在しないファイルを指す状態にならないことを確認してください。


8. DB更新失敗時

新しいファイルの保存には成功したが、
DB更新に失敗した場合について確認してください。

不要になった新規ファイルを安全にcleanupできる設計か確認してください。

ただしcleanup処理そのものの失敗によって、
本来のDB例外が分からなくならないようにしてください。


9. 既存セキュリティ対策を維持する

以下を壊さないでください。

Rate Limiting
HTTP request body最大6MiB
IFormFile最大5MiB
拡張子検証
Content-Type検証
Magic Bytes検証
GUIDファイル名
CoverImagePath仕様


10. テスト

最低限以下を確認または追加してください。

通常の表紙アップロード成功

既存アップロード表紙を新しい表紙へ置換した場合、
古いファイルが安全に削除される

default coverは削除されない

外部URLは削除されない

uploads/covers外のパスは削除されない

Path Traversal形式の値では外部ファイルを削除できない

Book削除時に対象のアップロード表紙をcleanupできる

DB更新失敗時に、
古い有効表紙を失わない

新規保存後のDB更新失敗時に、
可能な範囲で孤立した新規ファイルをcleanupする

物理ファイルcleanup失敗によって、
別の有効データを破壊しない


11. DockerとLinux互換性

今回のファイルパス処理が、
Windowsローカルだけでなく、
Linux Docker Containerでも安全に動作することを確認してください。

パス区切り文字を手書きで前提にせず、
Path.Combineなど.NET標準APIを利用してください。


12. 変更方針

監査結果として現在の実装がすでに安全な場合は、
不要な変更を加えないでください。

問題がある箇所だけ必要最小限に修正してください。

ファイルストレージサービスへの大規模リファクタリングは今回は行わないでください。


13. 検証

dotnet build
dotnet test

を実行してください。

コード変更があった場合は最新Docker Imageもbuildし、

YONDOKU_DEMO_MODE=true

でContainerを起動して、

トップページ
GET /api/books
Demo Seed 7冊
通常の表紙アップロード

が正常であることを確認してください。


14. 今回変更しないもの

Bookドメイン仕様
検索
フィルター
UI
Demo Seed内容
デモ用専用表紙
Rate Limit値
request body size値
XSS関連
Forwarded Headers
HTTPS
Render設定
認証
Persistent Volume

には進まないでください。


作業完了後に以下を報告してください。

監査したファイル
現在の表紙置換処理の順序
現在のBook削除と表紙cleanupの順序
危険だった箇所
変更した箇所
DB更新失敗時の扱い
ファイル削除失敗時の扱い
Path Traversal対策
default cover保護
外部URL保護
Linux Docker上でのパス安全性
追加したテスト
全テスト結果
Docker確認結果
残っているファイル操作上の課題

ここまで完了したら停止してください。