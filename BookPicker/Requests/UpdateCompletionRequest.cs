namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPリクエストで本の読了状態を変更するためのデータを表すクラス。
    /// </summary>
    public class UpdateCompletionRequest
    {
        public required bool IsCompleted { get; set; }
    }
}
