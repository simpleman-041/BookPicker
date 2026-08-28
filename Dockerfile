FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["BookPicker/BookPicker.csproj", "BookPicker/"]
RUN dotnet restore "BookPicker/BookPicker.csproj"

COPY . .
WORKDIR "/src/BookPicker"
RUN dotnet publish "BookPicker.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "BookPicker.dll"]
