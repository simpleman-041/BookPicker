今回は、既存のBookドメインルールを保護するためのテスト基盤を作成してください。

最初に docs/bookpicker_codex_current_spec.md と現在のリポジトリを確認してください。

今回の目的は、今後 Book モデルへ LastReadAt や CoverImagePath などを追加する前に、現在正常に動作している重要なドメインルールを自動テストとして固定することです。

今回は新機能を実装しないでください。

Book.cs、Controller、Service、Request、JavaScript、HTML、CSSなどの本番コードは変更しないでください。

LastReadAt と CoverImagePath もまだ追加しないでください。

Migrationの生成や実行、データベースの変更も行わないでください。

現在テストプロジェクトが存在しないため、BookPickerをテストできるテストプロジェクトを新しく作成してください。

既存のテストフレームワークが存在しない場合は、.NET環境に適した一般的なテストフレームワークを使用してください。

作成したテストプロジェクトは、既存のソリューションから通常の dotnet test で実行できる状態にしてください。

今回テストする対象は、現在の Book クラスにすでに存在するドメインルールです。

少なくとも以下を確認してください。

タイトルが null、空文字、空白だけの場合に拒否されること。

タイトルが許可された最大文字数を超えた場合に拒否されること。

TotalPages の既存の下限と上限が守られること。

Genre に未定義の値を指定した場合に拒否されること。

InterestLevel に未定義の値を指定した場合に拒否されること。

CurrentPage が負の値の場合に拒否されること。

CurrentPage が TotalPages を超えた場合に拒否されること。

CurrentPage が 0 の場合、ReadingStatus が NotStarted になること。

読書進捗が33パーセント付近の境界で、現在の Book 実装どおりの ReadingStatus になること。

読書進捗が66パーセント付近の境界で、現在の Book 実装どおりの ReadingStatus になること。

最終ページに到達しただけでは IsCompleted が自動的に true にならず、ReadingStatus も自動的に Completed にならないこと。

現在のドメインルールに従って読了状態にした場合、ReadingStatus が Completed になること。

読了済みの本で CurrentPage を TotalPages 未満へ戻した場合、IsCompleted が自動的に false になり、ReadingStatus も現在ページに応じた状態へ戻ること。

重要事項として、33パーセントと66パーセントの境界については、仕様を推測して新しい期待値を作らず、現在の Book.cs の計算方法を確認した上で、その既存挙動をテストしてください。

現在の本番コードに問題を発見してテストが失敗した場合でも、今回は本番コードを修正してテストを通さないでください。

その場合は、どのテストが失敗したか、現在の実装がどう動いているか、仕様書と矛盾しているかを報告してください。

テストのためだけに Book の private setter を public にしたり、既存のカプセル化を崩したりしないでください。

実装後は dotnet build と dotnet test を実行してください。

作業終了時に以下を報告してください。

作成または変更したファイル。

採用したテストフレームワーク。

追加したテストの一覧。

dotnet build の結果。

dotnet test の結果。

テストによって発見した既存コード上の問題。

次の実装段階へ進む前に確認すべき事項。

ここまで完了したら停止してください。

LastReadAt、CoverImagePath、一般編集API、読了API、Migration、フロントエンドの実装にはまだ進まないでください。
