namespace BookPicker.Requests
{
    /// <summary>
    /// HTTPリクエストで本のお気に入り状態を変更するためのクラス。
    /// </summary>
    public class UpdateFavoriteRequest
    {
        public required bool IsFavorite { get; set; }
    }
}
