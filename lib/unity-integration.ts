// ===========================================
// UNITY API INTEGRATION - CODE SNIPPETS
// ===========================================
// Copy these into your Unity project when ready
// Your API Base URL: https://your-site-url.vercel.app
// ===========================================

/*
========================================
1. API MANAGER (Create this first)
========================================
Create a new C# script called "APIManager.cs"
*/

/*
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

public class APIManager : MonoBehaviour
{
    public static APIManager Instance;
    
    // IMPORTANT: Replace with your actual deployed URL
    private const string BASE_URL = "https://your-site.vercel.app/api/unity";
    
    // Store these after login
    public string PlayerId { get; private set; }
    public string AccessToken { get; private set; }
    
    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    // ========== AUTHENTICATION ==========
    
    public IEnumerator Login(string email, string password, System.Action<bool, string> callback)
    {
        var data = new LoginData { action = "login", email = email, password = password };
        string json = JsonUtility.ToJson(data);
        
        using (UnityWebRequest request = new UnityWebRequest(BASE_URL + "/auth", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                PlayerId = response.player.id;
                AccessToken = response.session.access_token;
                callback(true, "Login successful!");
            }
            else
            {
                callback(false, "Login failed: " + request.error);
            }
        }
    }
    
    public IEnumerator Register(string email, string password, string nickname, System.Action<bool, string> callback)
    {
        var data = new RegisterData { action = "register", email = email, password = password, nickname = nickname };
        string json = JsonUtility.ToJson(data);
        
        using (UnityWebRequest request = new UnityWebRequest(BASE_URL + "/auth", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
                PlayerId = response.player.id;
                callback(true, "Registration successful!");
            }
            else
            {
                callback(false, "Registration failed: " + request.error);
            }
        }
    }
    
    // ========== DECKS ==========
    
    public IEnumerator GetPlayerDecks(System.Action<DeckListResponse> callback)
    {
        using (UnityWebRequest request = UnityWebRequest.Get(BASE_URL + "/decks?playerId=" + PlayerId))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<DeckListResponse>(request.downloadHandler.text);
                callback(response);
            }
            else
            {
                callback(null);
            }
        }
    }
    
    public IEnumerator GetDeckDetails(string deckId, System.Action<DeckDetailResponse> callback)
    {
        var data = new DeckRequest { deckId = deckId };
        string json = JsonUtility.ToJson(data);
        
        using (UnityWebRequest request = new UnityWebRequest(BASE_URL + "/decks", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<DeckDetailResponse>(request.downloadHandler.text);
                callback(response);
            }
            else
            {
                callback(null);
            }
        }
    }
    
    // ========== MATCH RESULTS ==========
    
    public IEnumerator SubmitMatchResult(MatchResultData matchData, System.Action<MatchResultResponse> callback)
    {
        string json = JsonUtility.ToJson(matchData);
        
        using (UnityWebRequest request = new UnityWebRequest(BASE_URL + "/match", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<MatchResultResponse>(request.downloadHandler.text);
                callback(response);
            }
            else
            {
                callback(null);
            }
        }
    }
    
    // ========== PLAYER INFO ==========
    
    public IEnumerator GetPlayerInfo(System.Action<PlayerInfoResponse> callback)
    {
        using (UnityWebRequest request = UnityWebRequest.Get(BASE_URL + "/player?playerId=" + PlayerId))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<PlayerInfoResponse>(request.downloadHandler.text);
                callback(response);
            }
            else
            {
                callback(null);
            }
        }
    }
}

// ========== DATA CLASSES ==========

[System.Serializable]
public class LoginData
{
    public string action;
    public string email;
    public string password;
}

[System.Serializable]
public class RegisterData
{
    public string action;
    public string email;
    public string password;
    public string nickname;
}

[System.Serializable]
public class AuthResponse
{
    public bool success;
    public PlayerData player;
    public SessionData session;
}

[System.Serializable]
public class PlayerData
{
    public string id;
    public string nickname;
    public string email;
    public int elo_rating;
    public int wins;
    public int losses;
}

[System.Serializable]
public class SessionData
{
    public string access_token;
    public string refresh_token;
}

[System.Serializable]
public class DeckListResponse
{
    public bool success;
    public DeckSummary[] decks;
}

[System.Serializable]
public class DeckSummary
{
    public string id;
    public string name;
    public string description;
    public string format;
}

[System.Serializable]
public class DeckRequest
{
    public string deckId;
}

[System.Serializable]
public class DeckDetailResponse
{
    public bool success;
    public DeckDetail deck;
}

[System.Serializable]
public class DeckDetail
{
    public string id;
    public string name;
    public int[] mainDeck;      // Array of card IDs
    public int[] extraDeck;     // Array of card IDs
    public int[] sideDeck;      // Array of card IDs
    public int mainDeckCount;
    public int extraDeckCount;
    public int sideDeckCount;
}

[System.Serializable]
public class MatchResultData
{
    public string winnerId;
    public string loserId;
    public string winnerDeckId;
    public string loserDeckId;
    public string format;       // "tcg", "ocg", "casual"
    public int turns;
    public int duration;        // seconds
    public string endCondition; // "lp_zero", "deck_out", "surrender"
}

[System.Serializable]
public class MatchResultResponse
{
    public bool success;
    public EloChanges eloChanges;
}

[System.Serializable]
public class EloChanges
{
    public EloChange winner;
    public EloChange loser;
}

[System.Serializable]
public class EloChange
{
    public string playerId;
    public int previousElo;
    public int newElo;
    public int change;
}

[System.Serializable]
public class PlayerInfoResponse
{
    public bool success;
    public PlayerData player;
    public PlayerStats stats;
}

[System.Serializable]
public class PlayerStats
{
    public int totalDecks;
    public int totalMatches;
}
*/

// ===========================================
// USAGE EXAMPLES IN YOUR UNITY GAME
// ===========================================

/*
// Login Example (in your LoginUI script):
public void OnLoginButtonPressed()
{
    StartCoroutine(APIManager.Instance.Login(emailInput.text, passwordInput.text, (success, message) =>
    {
        if (success)
        {
            Debug.Log("Logged in! Player ID: " + APIManager.Instance.PlayerId);
            SceneManager.LoadScene("MainMenu");
        }
        else
        {
            errorText.text = message;
        }
    }));
}

// Get Decks Example (in your DeckSelect script):
public void LoadDecks()
{
    StartCoroutine(APIManager.Instance.GetPlayerDecks((response) =>
    {
        if (response != null && response.success)
        {
            foreach (var deck in response.decks)
            {
                // Create UI buttons for each deck
                CreateDeckButton(deck);
            }
        }
    }));
}

// Submit Match Result Example (after duel ends):
public void OnDuelEnd(string winnerId, string loserId)
{
    var matchData = new MatchResultData
    {
        winnerId = winnerId,
        loserId = loserId,
        format = "tcg",
        turns = turnCount,
        duration = (int)matchDuration,
        endCondition = "lp_zero"
    };
    
    StartCoroutine(APIManager.Instance.SubmitMatchResult(matchData, (response) =>
    {
        if (response != null && response.success)
        {
            // Show ELO changes to players
            Debug.Log("Winner gained: " + response.eloChanges.winner.change + " ELO");
            Debug.Log("Loser lost: " + response.eloChanges.loser.change + " ELO");
        }
    }));
}
*/

export const UNITY_API_ENDPOINTS = {
  auth: '/api/unity/auth',
  decks: '/api/unity/decks',
  match: '/api/unity/match',
  player: '/api/unity/player',
}
