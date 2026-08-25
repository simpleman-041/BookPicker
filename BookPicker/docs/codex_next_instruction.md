今回は、LastReadAt と CoverImagePath をSQLiteへ反映するための EF Core Migration を生成し、その内容を確認してください。

最初に docs/bookpicker_codex_current_spec.md、現在の Book.cs、既存Migration、DbContext を確認してください。

今回の目的はMigrationファイルを生成して内容を検証することです。

database update は実行しないでください。

SQLiteデータベース本体を変更しないでください。

Controller、Request、Service、JavaScript、HTML、CSSなど、Migrationに直接必要のない本番コードは変更しないでください。

現在の Book モデルには nullable な LastReadAt と nullable な CoverImagePath が追加されています。

この2つを既存SQLiteデータベースへ追加するための新しいMigrationを生成してください。

LastReadAt は nullable な日時列として扱ってください。

CoverImagePath は nullable な文字列列として扱ってください。

既存レコードについては、どちらも null で移行できる構成にしてください。

既存データを推測して埋める処理は追加しないでください。

CreatedAt やその他の新しい列は追加しないでください。

既存の列の型や制約を、今回の目的と関係なく変更しないでください。

Migration生成後、生成されたMigrationファイルとModelSnapshotを確認してください。

確認する内容は以下です。

LastReadAt だけが意図したnullable日時列として追加されていること。

CoverImagePath だけが意図したnullable文字列列として追加されていること。

不要な列追加や列削除が発生していないこと。

既存列の型や制約が意図せず変更されていないこと。

Down処理によって、今回追加した2列だけを元に戻せること。

ModelSnapshotが現在のBookモデルと整合していること。

Migration生成後に dotnet build と dotnet test を実行してください。

既存43件のテストがすべて成功することを確認してください。

Migration生成のために外部パッケージの復元などが必要になった場合は、必要性を確認してから実行してください。

database update は絶対に実行しないでください。

データベースファイルを直接編集しないでください。

今回の作業終了時に以下を報告してください。

生成したMigration名。

作成または変更したファイル。

MigrationのUp処理で行われる変更。

MigrationのDown処理で行われる変更。

ModelSnapshotに反映された内容。

既存データへの影響。

dotnet build の結果。

dotnet test の結果。

既存43件のテストがすべて維持されたか。

Migration内容に不審な変更や想定外の差分がないか。

database update を実行する前に確認すべき事項。

ここまで完了したら停止してください。

database update、Controller変更、API追加、フロントエンド実装には進まないでください。
