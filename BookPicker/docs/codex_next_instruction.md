調査結果を確認しました。

未確定事項について、以下の方針で確定します。

- 画面表示名は Yondoku とする
- プロジェクト名、namespace、クラス名などコード内部は BookPicker のままとする
- クイック条件は単一選択とする
- 進捗表示は「現在ページ / 総ページ」と進捗バーを併記する
- 左側詳細フィルターは InterestLevel、Genre、ReadingStatus を select 形式で扱う
- 一般編集APIでは CoverImagePath を変更可能とする
- 新規登録でも CoverImagePath は任意で指定可能とする
- CoverImagePath が未設定の場合はデフォルト表紙を表示する
- 総ページ数を現在ページ未満へ変更しようとした場合は自動補正せず 400 とする
- LastReadAt は UTC で保存する
- CurrentPage が増加した場合だけ LastReadAt を更新する
- このルールは progress API だけでなく、一般編集APIから CurrentPage が増加した場合にも適用する
- 読了APIは PUT /api/books/{id}/completion とする
- Body は { "isCompleted": true } または { "isCompleted": false }
- 成功時は 204 とする
- 最終ページ未到達で読了にしようとした場合は 400 とする
- 新規登録UIを第一完成版に含める
- 「＋ 本を追加」操作から右側パネルを開く
- 右側パネルは「詳細表示」「編集」「新規登録」の3用途で再利用する
- 新規登録成功後は本一覧を更新する
- デフォルト表紙は第一段階では中立的なローカルプレースホルダーを使用する

一般編集では、各プロパティを途中状態で1つずつ変更して検証するのではなく、
リクエストされた最終状態全体の整合性を先に検証してから反映してください。

例:
現在 TotalPages = 500、CurrentPage = 400 の本を
TotalPages = 300、CurrentPage = 250
へ同時に変更することは、最終状態として 250 <= 300 なので有効です。

また、CurrentPage < TotalPages になった場合は IsCompleted を false にします。
CurrentPage == TotalPages になった場合でも IsCompleted を自動的に true にはしません。

まず docs/bookpicker_codex_current_spec.md をこの確定内容に合わせて更新してください。
この段階ではまだC#、JavaScript、CSS、Migration、DBは変更しないでください。

仕様書を更新したら、変更内容だけ報告して停止してください。