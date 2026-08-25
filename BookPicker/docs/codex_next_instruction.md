今回は Book モデルのドメインロジック拡張だけを実装してください。

最初に docs/bookpicker_codex_current_spec.md と現在の Book.cs、既存テストを確認してください。

今回の作業対象は Book モデルと、そのドメインロジックを検証するテストだけです。

Controller、Request、Service、JavaScript、HTML、CSS、Migration、DbContext、データベース本体は変更しないでください。

今回実装する内容は以下です。

Book に nullable な LastReadAt を追加してください。

LastReadAt は、新しい CurrentPage が変更前の CurrentPage より大きい場合だけ現在のUTC日時へ更新してください。

CurrentPage が同じ場合は LastReadAt を更新しないでください。

CurrentPage が減少した場合も LastReadAt を更新しないでください。

このルールは、将来どのAPIから CurrentPage が変更されても一貫して適用できるよう、可能な限り Book のドメインロジック側で管理してください。

新規作成された Book の LastReadAt は null としてください。

Book に nullable な CoverImagePath を追加してください。

CoverImagePath が null、空文字、空白だけの場合は null として保持してください。

第一完成版では CoverImagePath として、アプリ内相対パスまたは http、https の画像URLを扱う想定です。

Windowsのローカルファイルパスを直接扱う必要はありません。

CoverImagePath の詳細なURL検証や画像ファイルの存在確認は今回実装しないでください。

Book の既存 private setter とカプセル化を維持してください。

一般編集APIを将来実装するために、Book の編集可能項目を安全に更新できるドメインメソッドを追加してください。

対象は Title、Genre、TotalPages、CurrentPage、InterestLevel、CoverImagePath です。

各値を途中状態で順番に反映して検証するのではなく、リクエストされた最終状態全体の整合性を先に検証し、すべて有効な場合だけ状態を変更してください。

例えば、現在 TotalPages が500、CurrentPageが400のBookを、TotalPagesが300、CurrentPageが250へ同時に変更することは有効です。

最終状態として CurrentPage が TotalPages 以下だからです。

逆に、最終状態で CurrentPage が TotalPages を超える場合は拒否してください。

既存の Title、Genre、TotalPages、CurrentPage、InterestLevel の入力検証ルールは変更せず再利用してください。

編集の結果 CurrentPage が TotalPages 未満になった場合は IsCompleted を false にしてください。

編集の結果 CurrentPage が TotalPages と等しくなった場合でも IsCompleted を自動的に true にはしないでください。

ReadingStatus は編集後の最終状態から既存ルールに従って再計算してください。

一般編集によって CurrentPage が増加した場合にも LastReadAt を更新してください。

CurrentPage が減少または同じ場合は更新しないでください。

既存の SetIsCompleted の挙動変更は今回は行わないでください。読了API対応時に別タスクとして扱います。

今回追加した仕様について自動テストを追加してください。

少なくとも以下をテストしてください。

新規Bookの LastReadAt が null であること。

CurrentPage を増加させると LastReadAt が設定されること。

LastReadAt がUTCの現在時刻として妥当な範囲に入っていること。

CurrentPage を同じ値に更新しても LastReadAt が変わらないこと。

CurrentPage を減少させても LastReadAt が変わらないこと。

一般編集で CurrentPage が増加した場合にも LastReadAt が更新されること。

一般編集で CurrentPage が減少または同じ場合は LastReadAt が更新されないこと。

CoverImagePath が null、空文字、空白の場合に null として保持されること。

CoverImagePath に通常の値を指定した場合に保持されること。

TotalPages と CurrentPage を同時に有効な最終状態へ変更できること。

最終状態で CurrentPage が TotalPages を超える編集が拒否され、Bookの既存状態が途中まで変更されないこと。

編集後に CurrentPage が TotalPages 未満になった場合、IsCompleted が false になること。

編集によって最終ページへ到達しても IsCompleted が自動的に true にならないこと。

編集後に ReadingStatus が正しく再計算されること。

既存の24件のテストもすべて再実行してください。

実装後に dotnet build と dotnet test を実行してください。

既存テストが失敗した場合は、そのテストを削除したり期待値を変更して通さないでください。

原因を調査し、本番コードの変更による回帰であれば報告してください。

今回の作業終了時に以下を報告してください。

変更したファイル。

Book に追加したプロパティとドメインメソッド。

追加したテスト。

dotnet build の結果。

dotnet test の結果。

既存24テストがすべて維持されたか。

実装中に見つかった仕様上または設計上の問題。

次のMigration段階へ進む前に確認すべき事項。

ここまで完了したら停止してください。

Migrationの生成や適用、ControllerやAPIの変更、フロントエンド実装には進まないでください。