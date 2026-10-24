# Système de Badges pour Sidebar - Instructions

## Ce qui a été implémenté

### Frontend (transito-admin-dashboard)

1. **Nouveau service : `SidebarBadgeService`** (`src/app/services/sidebar-badge.service.ts`)
    - Gère les badges pour les sections de la sidebar
    - Utilise le `DashboardService` existant pour récupérer les alertes
    - Fournit des computed properties pour les badges par section et par route
    - Intègre Pusher pour les mises à jour en temps réel
    - Exposes:
        - `sectionBadges()`: Badges agrégés par section
        - `routeBadges()`: Badges par route spécifique
        - `totalCount()`: Compte total de toutes les alertes
        - `getSectionCount(sectionTitle)`: Compte pour une section
        - `getRouteCount(route)`: Compte pour une route
        - `getSectionSeverity(sectionTitle)`: Sévérité pour une section

2. **Mises à jour du Layout** (`src/app/layout/layout.component.ts`)
    - Injection du `SidebarBadgeService`
    - Ajout de `navGroupsWithBadges()`: Computed property pour les groupes avec badges
    - Ajout de `getItemBadgeCount(route)`: Méthode pour obtenir le count d'un item
    - Ajout de styles CSS pour les badges (danger, warning, info)

3. **Mises à jour du Template** (`src/app/layout/layout.component.html`)
    - Affichage du badge total en haut de la sidebar
    - Badge sur le titre de chaque section
    - Badge sur chaque item de navigation qui a des actions

### Backend (Transito-api)

1. **Mise à jour du PusherAuthController** (`src/Controller/PusherAuthController.php`)
    - Ajout du canal `private-admin-dashboard` pour les admins

## Configuration requise

### 1. Vérifier la configuration Pusher

Assurez-vous que vos fichiers d'environnement contiennent :

```typescript
// environment.prod.ts (et environment.ts)
export const environment = {
  pusherKey: 'votre_pusher_key',
  pusherCluster: 'votre_cluster',
  pusherUseTLS: true,
  pusherAuthEndpoint: '/api/pusher/auth',
  ...
};
```

### 2. Activer les mises à jour en temps réel

Pour que les badges se mettent à jour en temps réel, vous devez émettre des événements Pusher depuis votre backend lorsque des actions se produisent.

#### Exemple : Dans vos contrôleurs administrateurs

Voici un exemple de comment émettre un événement lorsqu'une nouvelle demande de retrait est créée :

```php
// Dans AdminWithdrawalController.php ou similaire

use Pusher\Pusher;

class AdminWithdrawalController extends AbstractController
{
    public function __construct(
        private Pusher $pusher,
        // ... autres dépendances
    ) {}

    public function createWithdrawalRequest(Request $request): JsonResponse
    {
        // ... votre logique de création

        // Après avoir créé la demande de retrait
        $this->pusher->trigger(
            'private-admin-dashboard',
            'new-alert',
            [
                'id' => 'alert_withdrawals',
                'type' => 'withdrawal',
                'label' => 'Nouvelle demande de retrait',
                'description' => 'Une nouvelle demande de retrait a été créée',
                'amount' => $withdrawal->getAmount(),
                'count' => 1, // ou le nombre total
                'severity' => 'warning',
            ]
        );

        return $this->json(['success' => true, 'data' => $withdrawal]);
    }

    public function approveWithdrawal($id): JsonResponse
    {
        // ... votre logique d'approbation

        // Mettre à jour ou supprimer l'alerte
        $this->pusher->trigger(
            'private-admin-dashboard',
            'alerts-refresh',
            [] // Pas de payload nécessaire, le frontend rechargera
        );

        return $this->json(['success' => true]);
    }
}
```

#### Événements Pusher supportés par le frontend

Le `SidebarBadgeService` écoute ces événements uniquement sur le canal privé `private-admin-dashboard` :

1. **`new-alert`** - Nouvelle alerte créée

    ```json
    {
    	"id": "alert_withdrawals",
    	"type": "withdrawal",
    	"label": "Nouvelle demande de retrait",
    	"description": "Description de l'alerte",
    	"amount": 1000,
    	"count": 1,
    	"severity": "warning"
    }
    ```

2. **`alert-updated`** - Alerte mise à jour

    ```json
    {
    	"id": "alert_withdrawals",
    	"count": 5,
    	"severity": "danger"
    }
    ```

3. **`alert-incremented`** - Nouvelle action ajoutée à un compteur existant

```json
{
	"id": "alert_support",
	"increment": 1
}
```

4. **`alert-deleted`** - Alerte supprimée

    ```json
    {
    	"id": "alert_withdrawals"
    }
    ```

5. **`alerts-refresh`** - Rafraîchir toutes les alertes
    ```json
    {}
    ```

### 3. Mappage des types d'alerte aux sections

Le service utilise ce mappage par défaut :

```typescript
{
  withdrawal: "Finance",
  refund: "Finance",
  agency: "Modération",
  reservation: "Modération",
  support: "Services clients",
  user: "Modération",
  trip: "Modération",
  application: "Modération",
  finance: "Finance",
  admin: "Administration",
}
```

Vous pouvez personnaliser ce mappage dans le `SidebarBadgeService` si nécessaire.

### 4. Mappage des types d'alerte aux routes

Chaque type d'alerte peut être associé à une ou plusieurs routes :

```typescript
{
  withdrawal: ["/finance/withdrawals"],
  refund: ["/finance/refunds", "/finance/financial-stats"],
  agency: ["/moderation/agencies"],
  // ... etc
}
```

Cela permet d'afficher des badges sur les items de menu spécifiques.

## Personnalisation

### Modifier les couleurs des badges

Dans `layout.component.ts`, vous pouvez modifier les classes CSS :

```css
.badge-danger {
	background-color: #ef4444;
	color: white;
}
.badge-warning {
	background-color: #f59e0b;
	color: white;
}
.badge-info {
	background-color: #3b82f6;
	color: white;
}
```

### Modifier la position des badges

Dans `layout.component.html`, ajustez les styles des spans de badge.

## Testing

Pour tester le système :

1. Connectez-vous à votre dashboard admin
2. Vérifiez que les badges apparaissent sur les sections
3. Créez une nouvelle demande de retrait via l'API
4. Les badges devraient se mettre à jour automatiquement (si Pusher est configuré)

## Résolution des problèmes

### Problème : Les badges ne s'affichent pas

- Vérifiez que l'admin est connecté
- Vérifiez que `DashboardService.loadAlerts()` retourne des données
- Vérifiez la console du navigateur pour les erreurs

### Problème : Les mises à jour en temps réel ne fonctionnent pas

- Vérifiez la configuration Pusher
- Vérifiez que le canal `private-admin-dashboard` est autorisé
- Vérifiez que les événements sont bien émis depuis le backend
- Vérifiez la console pour les erreurs de connexion Pusher

## Prochaines étapes recommandées

1. **Créer un DashboardAlertService** côté backend pour centraliser l'envoi d'événements
2. **Ajouter des tests unitaires** pour le SidebarBadgeService
3. **Personnaliser les couleurs et styles** selon votre charte graphique
4. **Étendre le mappage** pour inclure toutes les sections de votre application
