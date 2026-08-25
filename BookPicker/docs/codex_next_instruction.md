今回は、現行仕様に必要なバックエンドAPIと一覧取得処理を実装してください。

最初に docs/bookpicker_codex_current_spec.md、現在の Book.cs、BooksController.cs、Request関連クラス、FilterとSort関連クラス、既存テストを確認してください。

今回の作業対象は、Controller、Request、FilterとSortに必要なバックエンド処理、およびそれらを検証するテストです。

JavaScript、HTML、CSSなどのフロントエンドは変更しないでください。

新しいMigrationは生成しないでください。

database updateは実行しないでください。

SQLiteデータベース本体のデータを追加、変更、削除しないでください。

今回実装する内容は以下です。

一般編集APIとして PUT /api/books/{id} を追加してください。

一般編集APIでは、Title、Genre、TotalPages、CurrentPage、InterestLevel、CoverImagePath を受け取れるRequestクラスを用意してください。

ReadingStatus、LastReadAt、IsCompleted は一般編集Requestから直接変更できないようにしてください。

更新処理では、現在Bookに実装されている UpdateDetails のドメインロジックを利用してください。

Bookのprivate setterをpublicへ変更しないでください。

存在しないidの場合は 404 Not Found としてください。

ユーザー入力によってBookのドメイン検証に失敗した場合は 400 Bad Request としてください。

更新成功時は 204 No Content としてください。

一般編集によってCurrentPageが増加した場合のLastReadAt更新は、既存のBookドメインロジックに任せ、Controller側で同じ処理を重複実装しないでください。

次に、読了状態を変更する専用APIを追加してください。

URLは PUT /api/books/{id}/completion としてください。

Request Bodyでは isCompleted に true または false を指定できるようにしてください。

trueの場合、CurrentPageがTotalPagesと一致している場合だけ読了にできるようにしてください。

CurrentPageがTotalPages未満の状態でtrueを指定した場合は 400 Bad Request としてください。

falseの場合は読了解除として扱ってください。

成功時は 204 No Content としてください。

存在しないidの場合は 404 Not Found としてください。

現在の SetIsCompleted は最終ページ未到達時にtrueを指定しても何もしない実装になっています。

現行仕様ではこの操作を400とする必要があるため、Book側で不正な読了操作を明確に検出できるよう、必要最小限の変更を行ってください。

既存の読了ルールやReadingStatus計算を単純化しないでください。

既存の PUT /api/books/{id}/progress は維持してください。

CurrentPage更新によるLastReadAtの更新は、すでにBook側の UpdateCurrentPageAndReadingStatus に含まれているため、そのドメインロジックを利用してください。

存在しないidは404、CurrentPageの不正値は400という現在のAPIルールを維持してください。

新規登録APIについて、CreateBookRequest に nullable な CoverImagePath を追加してください。

POST /api/books でBookを生成するときに CoverImagePath を渡せるようにしてください。

CoverImagePathを指定しない既存リクエストも正常に動作するようにしてください。

新規Bookの LastReadAt は引き続き null としてください。

次に GET /api/books の既定順を変更してください。

明示的な並び替えが指定されていない場合は Id の降順で返してください。

データベースや列の自然な取得順には依存しないでください。

既存のタイトル検索、Genre、ReadingStatus、InterestLevelなどのフィルター機能は維持してください。

クイック条件で使用するため、LastReadAt を並び替え対象へ追加してください。

LastReadAt降順の場合は、日時が新しい本から表示し、LastReadAtがnullの本は最後にしてください。

既存の TotalPages、InterestLevel などの並び替えは壊さないでください。

TotalPages降順は「たっぷり読む」、TotalPages昇順は「短めに読む」で将来使用しますが、今回はフロントエンドのクイックボタン自体は実装しないでください。

FilterRequest、FilterCriteria、SortRequest、SortCriteriaなどのユーザー入力検証で ArgumentException などが発生した場合に、500 Internal Server Errorではなく400 Bad Requestを返すようにしてください。

既存の正常なFilterとSortの挙動は維持してください。

MinPagesとMaxPagesは現行UIでは使用しませんが、今回は削除しないでください。

BookPicker.httpなどの古いHTTP例やテンプレートファイルの整理は今回の作業対象外です。

今回の仕様について自動テストを追加してください。

少なくとも以下を確認してください。

PUT /api/books/{id} で正常な編集が成功すること。

存在しないidの一般編集が404になること。

不正な一般編集が400になること。

一般編集からReadingStatus、LastReadAt、IsCompletedを直接設定できないRequest設計になっていること。

一般編集でCurrentPageが増加するとLastReadAtが更新されること。

一般編集でCurrentPageが減少または同じ場合はLastReadAtが更新されないこと。

PUT /api/books/{id}/completion で最終ページ到達済みの本を読了にできること。

最終ページ未到達で読了にしようとすると400になること。

読了解除が成功すること。

存在しないidの読了操作が404になること。

POST /api/books でCoverImagePathを指定できること。

CoverImagePath未指定でも既存どおり登録できること。

GET /api/books の並び替え未指定時にId降順になること。

LastReadAt降順で新しい日時が先になること。

LastReadAtがnullの本がLastReadAt降順では後ろになること。

既存のTotalPagesとInterestLevelなどの並び替えが維持されていること。

不正なFilterまたはSort入力が400になり、500にならないこと。

既存43件のテストもすべて再実行してください。

必要であれば、テストには実運用DBではない一時的なSQLiteデータベースまたは適切なテスト用構成を使用してください。

実運用中のSQLiteデータベースのBookデータをテストのために変更しないでください。

実装後に dotnet build と dotnet test を実行してください。

既存テストが失敗した場合は、期待値を変更したりテストを削除して無理に通さないでください。

今回の変更による回帰か、現行仕様との不一致かを調査してください。

今回の作業終了時に以下を報告してください。

変更したファイル。

新規作成したRequestクラス。

追加または変更したAPI。

Bookモデルに行った変更とその理由。

一覧取得と並び替えに行った変更。

エラー処理に行った変更。

追加したテスト。

dotnet build の結果。

dotnet test の結果。

既存43件のテストがすべて維持されたか。

新しく追加したテストがすべて成功したか。

実装中に発見した仕様上または設計上の問題。

フロントエンド実装へ進む前に確認すべき事項。

ここまで完了したら停止してください。

JavaScript、HTML、CSS、画面実装には進まないでください。
