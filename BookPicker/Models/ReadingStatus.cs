namespace BookPicker.Models
{
    /// <summary>
    /// 読書の進捗を6段階で表す列挙型。
    /// </summary>
    public enum ReadingStatus
    {
        NotStarted = 0,
        EarlyStage,
        MidWay,
        LateStage,
        Completed,
    }
}
