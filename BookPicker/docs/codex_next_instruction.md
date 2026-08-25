今回は、すでに生成済みの AddLastReadAtAndCoverImagePath Migration を現在のSQLiteデータベースへ適用し、適用結果を確認してください。

最初に docs/bookpicker_codex_current_spec.md、現在のConnectionString、DbContext、既存Migration、現在のSQLiteデータベースの場所を確認してください。

今回の目的は、すでに生成済みのMigrationを安全に実データベースへ適用することです。

新しいMigrationは生成しないでください。

Book.cs、Controller、Request、Service、JavaScript、HTML、CSSなどの本番コードは変更しないでください。

既存Migrationファイルも変更しないでください。

最初に、現在適用済みのMigrationと未適用のMigrationを確認してください。

今回適用対象となる未適用Migrationが AddLastReadAtAndCoverImagePath だけであることを確認してください。

それ以外の想定外の未適用Migrationが存在する場合は database update を実行せず、そこで停止して報告してください。

次に、現在使用されているSQLiteデータベースファイルを特定してください。

既存データベースが存在する場合は、Migration適用前に同じ場所または安全なバックアップ用の場所へコピーを作成してください。

バックアップファイルは元のデータベースと区別できる名前にしてください。

既存データベースが見つからない場合や、ConnectionStringから想定外の場所を参照している場合は、新しいデータベースを勝手に作成せず、そこで停止して報告してください。

Migration適用前に、可能な範囲でBooksテーブルの既存レコード数を確認してください。

その後、既存の AddLastReadAtAndCoverImagePath Migration を database update によって適用してください。

適用後、以下を確認してください。

Booksテーブルに CoverImagePath 列が存在すること。

Booksテーブルに LastReadAt 列が存在すること。

CoverImagePath がnullを許可していること。

LastReadAt がnullを許可していること。

既存のBooksレコードが失われていないこと。

Migration適用前後で既存レコード数が変化していないこと。

既存レコードの CoverImagePath が null であること。

既存レコードの LastReadAt が null であること。

Migration履歴に AddLastReadAtAndCoverImagePath が適用済みとして記録されていること。

今回追加した2列以外について、意図しない列削除やデータ変更が発生していないこと。

Migration適用後に dotnet build と dotnet test を実行してください。

既存43件のテストがすべて成功することを確認してください。

可能であれば、アプリケーションコードを変更せずにEF CoreからBook一覧を読み取れることも確認してください。

ただし、確認のためにデータの追加、更新、削除は行わないでください。

今回の作業終了時に以下を報告してください。

使用したSQLiteデータベースファイルの場所。

作成したバックアップファイルの場所。

適用前に適用済みだったMigration。

適用前に未適用だったMigration。

実行したdatabase updateの結果。

適用後のMigration状態。

Booksテーブルへ追加された列。

Migration適用前の既存Bookレコード数。

Migration適用後の既存Bookレコード数。

既存データが維持されたことを確認できたか。

dotnet build の結果。

dotnet test の結果。

既存43件のテストがすべて維持されたか。

想定外の変更や問題がなかったか。

次のAPI実装段階へ進む前に確認すべき事項。

ここまで完了したら停止してください。

Controller、API、Request、フロントエンドの実装には進まないでください。
