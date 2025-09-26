# Application de Livraison Express

## Utilisateur Principal
Entreprises de livraison express

---

## Fonctions Principales

### 1. Planification des itinéraires de livraison
Trouvez l'itinéraire optimal en fonction de :
- Type de colis
- Origine et destination
- Charge actuelle du système de livraison
- Distance et coût des itinéraires disponibles
- Imprévus : conditions météorologiques, blocages routiers
- Exigences spécifiques des clients

---

### 2. Consultation de la localisation du colis
Grâce à un système de simulation de livraison en temps réel, l’utilisateur peut :
- Visualiser la position actuelle du coursier
- Suivre le colis en temps réel

---

### 3. Modification d’itinéraire sur demande du client
Si un client souhaite :
- Renvoyer un colis
- Modifier l’adresse de livraison

Le système mettra automatiquement à jour l’itinéraire du colis.

---

### 4. Suivi de la charge et de l’état des points de livraison
- Visualisation en temps réel de la charge de chaque point de livraison
- Optimisation de la gestion logistique

---

## Rôles des Utilisateurs

| Utilisateur                   | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| **Dispatcheur**              | Planifie les itinéraires, assigne les tâches, traite les demandes clients  |
| **Livreurs**                 | Exécutent les livraisons, mettent à jour l’état des colis                   |
| **Service client**           | Reçoit les demandes de modification des clients et les transmet au système |
| **Administrateur système**   | Surveille les centres de tri, assure le bon fonctionnement du système      |

## Risques
À ce stade, le principal risque du projet est de savoir si la conception de la structure de la base de données peut couvrir tous les besoins réels de l’entreprise. Si la conception n’est pas parfaite, l’extension fonctionnelle ultérieure et l’interrogation des données seront limitées, ce qui affectera la flexibilité et la maintenabilité du système. Dans le même temps, la cohérence et l’intégrité des données sont également des points de risque importants, et des associations complexes entre plusieurs tables peuvent facilement entraîner une perte ou une incohérence de données sans contraintes raisonnables ni mécanismes de transaction. De plus, à mesure que la quantité de données continue d’augmenter, les performances du système peuvent devenir des goulots d’étranglement, en particulier dans les scénarios de fonctionnement à haute fréquence tels que les enregistrements historiques et le suivi en temps réel, de sorte que les plans d’optimisation doivent être envisagés à l’avance.

