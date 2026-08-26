Codex 次回指示

今回は、確定した詳細パネル仕様と読了仕様の変更を現行仕様へ反映し、読了に関するバックエンドのドメインルールとテストを更新してください。

最初に docs/bookpicker_codex_current_spec.md、現在の Book.cs、読了API、既存テストを確認してください。

今回の作業は、仕様書更新と読了ルールの変更だけを対象とします。

詳細パネルのHTML、CSS、JavaScript実装にはまだ進まないでください。

画像アップロード機能もまだ実装しないでください。

Migrationの生成や適用、SQLiteデータベース本体の変更も行わないでください。

1. 詳細パネル仕様として確定した内容

今後実装する右側詳細パネルは、詳細表示、編集、新規登録で共用します。

詳細表示では、少なくとも以下を扱います。

タイトル。

現在ページと総ページ数。

進捗バー。

表紙画像。

Genre。

InterestLevel。

IsCompletedをユーザー向けに表した読了状態。

LastReadAt。

ReadingStatusは詳細パネルには表示しません。

ReadingStatusは一覧カードの進捗表示や内部ロジックで利用し、詳細パネルでは重複表示しない方針です。

Idはユーザー向け情報として表示しません。

CoverImagePathという文字列も詳細表示には出さず、表紙画像表示のためだけに利用します。

LastReadAtは表示専用で、ユーザーが直接編集する項目にはしません。

通常表示では、進捗は CurrentPage / TotalPages の形式と進捗バーで表示します。

編集モードでは CurrentPage と TotalPages の両方を編集可能にします。

編集開始時は編集ボタンを保存ボタンへ切り替えます。

編集モードにはキャンセル操作を用意します。

キャンセルは編集内容を保存せず詳細表示へ戻るために使用します。

詳細パネル自体を閉じるための閉じる操作も用意します。

削除ボタンは危険操作であることが視覚的に分かるようにし、詳細パネル下部へ配置する方針です。

実際の削除処理では、将来的に確認操作を挟む想定です。

2. 表紙画像について

表紙クリックから画像ファイルを選択し、サーバーへアップロードし、保存された画像のパスを CoverImagePath に保存する機能を将来的に実装します。

想定する流れは以下です。

表紙画像をクリック。

ファイル選択UIを開く。

ユーザーが画像ファイルを選択。

画像をサーバーへアップロード。

サーバー側へ画像を保存。

保存された画像のパスを CoverImagePath へ設定。

ただし、この画像アップロード機能は他の主要機能完成後に集中的に実装します。

今回は画像アップロード機能を実装しないでください。

現在の CoverImagePath とデフォルト表紙による表示仕様は維持してください。

3. 読了仕様の変更

現行仕様の「CurrentPageがTotalPagesに到達していない場合は読了にできず400 Bad Requestとする」というルールを変更します。

新しい仕様では、ユーザーが「読了にする」操作を行った場合、現在ページが総ページ数未満でも読了にできます。

その場合、システムがCurrentPageをTotalPagesへ自動的に進めます。

例。

変更前。

CurrentPage = 100

TotalPages = 180

IsCompleted = false

ユーザーが読了にする操作を実行。

変更後。

CurrentPage = 180

TotalPages = 180

IsCompleted = true

ReadingStatus = Completed

CurrentPageがTotalPages未満だった場合、この読了操作によってページが増加したため、LastReadAtも現在のUTC日時へ更新してください。

CurrentPageがすでにTotalPagesと一致している状態で読了にした場合もIsCompletedをtrueにし、ReadingStatusをCompletedにしてください。

今回の仕様では、ユーザーが明示的に「読了にする」と操作した行為を最後に読み終えた操作とみなし、LastReadAtを現在のUTC日時へ更新する方針とします。

したがって読了操作で isCompleted = true が成功した場合は、CurrentPageがすでにTotalPagesだった場合も含め、LastReadAtを現在のUTC日時へ更新してください。

この読了操作によるLastReadAt更新は、通常の進捗更新とは別の明示的なドメインルールとして実装して構いません。

4. 読了解除

ユーザーが読了解除を行った場合は以下とします。

IsCompletedをfalseへ変更。

CurrentPageは変更しない。

LastReadAtも変更しない。

ReadingStatusは現在のCurrentPageとTotalPagesに基づいて再計算する。

したがって、TotalPagesまで到達した状態で読了解除した場合は、CurrentPageはTotalPagesのまま、ReadingStatusはCompletedではなくLateStageになります。

システムが勝手にCurrentPageを以前の値へ戻してはいけません。

5. Bookドメインロジック

今回の変更はControllerだけで処理せず、Bookのドメインルールとして一貫して表現してください。

private setterによる既存のカプセル化は維持してください。

既存のReadingStatus計算ロジックを重複実装しないでください。

現在存在する読了用ドメインメソッドを確認し、新仕様に合わせて必要最小限の変更を行ってください。

古い仕様との互換性のためだけに、意味の重複した読了メソッドを複数残す必要がある場合は、整理案を報告してください。

ControllerはBookのドメインメソッドを呼び出し、結果をHTTPレスポンスへ変換する役割に留めてください。

6. 読了API

既存の

PUT /api/books/{id}/completion

を維持してください。

Request Bodyも isCompleted にtrueまたはfalseを指定する現在の形式を維持してください。

isCompleted = true の場合は、最終ページ未到達でも400にしないでください。

新しいドメインルールに従い、CurrentPageをTotalPagesへ変更したうえで読了状態にしてください。

isCompleted = false の場合は読了解除を行ってください。

存在しないidは404 Not Foundを維持してください。

正常終了時は204 No Contentを維持してください。

7. テストの更新

今回の仕様変更により、旧仕様を固定しているテストの一部は意図的に変更する必要があります。

「最終ページ未到達で読了要求を行うと400になる」という旧仕様のテストは削除するだけではなく、新仕様を検証するテストへ置き換えてください。

少なくとも以下を確認してください。

CurrentPageがTotalPages未満の本を読了にすると、CurrentPageがTotalPagesへ変更されること。

同時にIsCompletedがtrueになること。

ReadingStatusがCompletedになること。

読了操作によってLastReadAtがUTCの現在日時へ更新されること。

CurrentPageがすでにTotalPagesの場合でも、読了操作によってIsCompletedがtrueになること。

その場合もLastReadAtが現在のUTC日時へ更新されること。

読了解除するとIsCompletedがfalseになること。

読了解除ではCurrentPageが変更されないこと。

読了解除ではLastReadAtが変更されないこと。

TotalPagesまで到達した本を読了解除するとReadingStatusがLateStageになること。

completion APIで最終ページ未到達の読了要求が成功し204になること。

completion APIで読了後のBookを取得した場合、CurrentPageがTotalPagesと一致し、IsCompletedがtrueであること。

既存の通常進捗更新では、CurrentPage増加時だけLastReadAtが更新される既存ルールが維持されること。

読了解除によってLastReadAtが更新されないこと。

既存の他のテストを、新仕様と無関係な理由で変更しないでください。

8. 仕様書更新

docs/bookpicker_codex_current_spec.md を今回確定した内容へ更新してください。

特に以下の旧記述を残さないでください。

最終ページに到達していない場合は読了にできない。

最終ページ未到達で読了要求を行うと400 Bad Request。

読了操作ではCurrentPageを変更しない。

これらは現行仕様ではありません。

また、詳細パネルについて以下を現行仕様として反映してください。

ReadingStatusは詳細パネルに表示しない。

LastReadAtは表示専用。

通常表示ではCurrentPage / TotalPagesと進捗バーを表示。

編集時はCurrentPageとTotalPagesを編集可能。

編集、保存、キャンセル、閉じる操作を持つ。

画像アップロードは将来機能として保留。

削除は詳細パネル下部の危険操作として扱う。

9. 今回変更してはいけないもの

HTML。

CSS。

JavaScript。

画像ファイル。

画像アップロード機能。

新規登録UI。

詳細パネルUI。

検索。

詳細フィルター。

クイック条件。

Migration。

SQLiteデータベース本体。

今回の目的に直接関係しないAPI。

10. 検証

実装後に dotnet build と dotnet test を実行してください。

今回の仕様変更によって変更対象となった旧仕様テスト以外は、既存テストを維持してください。

テストを無理に通すために期待値を変更せず、新仕様によって意図的に変更する必要があるテストだけを更新してください。

11. 作業終了時の報告

以下を報告してください。

変更したファイル。

仕様書で変更した箇所。

Bookの読了ドメインロジックをどのように変更したか。

読了時のCurrentPage変更方法。

読了時のLastReadAt更新方法。

読了解除時の挙動。

completion APIへ行った変更。

旧仕様から変更したテスト。

新しく追加したテスト。

dotnet build の結果。

dotnet test の結果。

テスト総数、成功数、失敗数、スキップ数。

今回の仕様変更による回帰がないことを確認できたか。

詳細パネル実装へ進む前に確認すべき事項。

ここまで完了したら停止してください。

フロントエンド実装や画像アップロード実装には進まないでください。