# Rapport de travail hebdomadaire 2 - Développement du système de simulation logistique

## Sélection du framework technologique

Cette semaine, nous avons d'abord finalisé le choix du framework de développement. Après discussion au sein de notre équipe, nous avons opté pour une architecture de séparation front-end/back-end.

### Stack technologique front-end
- **Langage principal** : JavaScript
- **Stylisation** : CSS  
- **Framework** : React
- **Avantages** : Offre une expérience de développement basée sur les composants et un écosystème riche

### Stack technologique back-end
- **Langage** : Python
- **Framework** : FastAPI
- **Avantages** : Hautes performances, génération automatique de documentation, annotations de type, parfaitement adapté aux exigences de notre système de simulation logistique

## Configuration de l'environnement Docker conteneurisé

Afin de garantir la cohérence de l'environnement de développement et la simplicité du déploiement, nous avons créé un environnement de développement Docker conteneurisé.

### Réalisations
- Encapsulation de l'environnement d'exécution Python via conteneurs Docker
- Intégration des dépendances et configurations d'application
- Résolution des problèmes de différences d'environnement entre machines de développement
- Simplification du travail de configuration d'environnement lors de la collaboration d'équipe
- Amélioration de l'efficacité de développement

## Développement du code back-end

Nous avons ensuite commencé le développement du code back-end, en nous concentrant sur l'implémentation du module de génération de données.

### Module de génération de données
Implémentation d'un module de génération de données pour le système de simulation de réseau logistique, capable de générer intelligemment la topologie du réseau logistique.

#### Fonctionnalités principales
- **Génération de stations** : Génération aléatoire de 25 stations logistiques dans une carte 100×100
- **Localisation des centres** : Détermination intelligente de 5 centres logistiques via l'algorithme de clustering K-means
- **Construction du réseau** : Structure réseau à trois niveaux
  - Routes aériennes entre centres
  - Connexions autoroutières centre-à-station
  - Routes conventionnelles entre stations (distance < 30)

#### Caractéristiques techniques
- **Configuration paramétrique** : Support d'ajustement flexible de l'échelle du réseau
- **Détection de conflits** : Mécanisme de détection de conflits de position et ajustement automatique
- **Standardisation des données** : Format adapté au traitement ultérieur par algorithmes de graphes
- **Support de visualisation** : Interface matplotlib pré-configurée
- **Configuration d'attributs** : Chaque nœud configuré avec débit, délai temporel, coût, etc.
- **Calcul des coûts** : Calcul des coûts temporels et monétaires basé sur la distance euclidienne

### Structure du code
Le code adopte une conception modulaire claire avec des interfaces réservées pour l'interaction front-end/back-end, garantissant l'extensibilité et la maintenabilité du système.

## Perspectives
Ces travaux de base établissent une fondation solide pour l'intégration ultérieure des algorithmes, le développement de l'interface front-end et les tests d'intégration système. La semaine prochaine, nous nous concentrerons sur l'implémentation des algorithmes de chemin comme Dijkstra et le développement des services back-end FastAPI.
