# Système de Gestion de la Logistique Express - Rapport Hebdomadaire

## Travail Principal de Cette Semaine

Le travail principal que nous avons réalisé cette semaine a consisté à établir la structure de la base de données du système de gestion de la logistique express.

## 1. Concepts de Base du Système

Cette base de données est un système de gestion de l'information conçu pour les entreprises de livraison express. Il permet d'enregistrer et de gérer l'ensemble du processus de livraison des colis. Elle peut être considérée comme une représentation informatisée du réseau de livraison express réel, incluant tous les points de livraison express, les itinéraires de livraison, les informations sur les colis et les enregistrements de livraison.

## 2. Structure des Données Principales

Les trois composants les plus importants du système sont les points de livraison express, les itinéraires et les colis.

La table des points de livraison express enregistre tous les points de livraison express et les centres de tri, y compris des informations telles que leur localisation et leur capacité de traitement. La table des itinéraires enregistre les correspondances entre les points de livraison, comme le temps et le coût du trajet entre le point A et le point B. La table des colis enregistre les informations de base de chaque colis, notamment l'expéditeur, le destinataire, l'origine et la destination.

En plus de ces trois tables principales, il existe une table des clients qui enregistre les informations utilisateur et une table des commandes qui enregistre les commandes commerciales. Chaque commande peut contenir plusieurs colis, chacun appartenant à un client spécifique. Cela établit une chaîne de relations commerciales, du client à la commande, puis au colis.

## 3. Mécanisme de Gestion des Trajets

Le tableau des trajets des colis est un élément essentiel du système, planifiant l'itinéraire de livraison spécifique à chaque colis. À l'instar d'un logiciel de cartographie, le système calcule l'itinéraire le plus approprié en fonction de facteurs tels que l'origine et la destination du colis, ainsi que son expédition ou non, et enregistre les arrêts par lesquels le colis doit passer.

Lorsqu'une modification d'itinéraire est nécessaire, par exemple suite à une demande de changement d'adresse ou à un problème d'itinéraire, le tableau des demandes de modification d'itinéraire enregistre ces modifications, y compris le motif du changement et la nouvelle adresse de destination, garantissant ainsi une documentation complète de chaque ajustement d'itinéraire.

## 4. Système de Suivi et de Suivi

Le tableau de l'historique des colis enregistre chaque événement clé du processus de transport, comme l'heure d'expédition depuis un arrêt spécifique et l'heure d'arrivée à l'arrêt suivant. Les clients accèdent à ces informations lorsqu'ils se renseignent sur le statut de leurs colis.

Le tableau de suivi de la charge enregistre en temps réel les niveaux de trafic à chaque arrêt et itinéraire, aidant ainsi les gestionnaires à identifier les congestions potentielles et la nécessité d'ajuster l'allocation des colis. Le tableau de contingence enregistre les conditions imprévues affectant la livraison, telles que les conditions météorologiques et routières, et permet ainsi d'ajuster les itinéraires.

## 5. Logique de Relation des Données

Les relations entre les données au sein du système sont relativement simples et directes. Le colis est le point central reliant différents points de données, reliant des informations telles que l'expéditeur, l'adresse du destinataire, la position actuelle et l'itinéraire prévu. Les arrêts sont interconnectés par des itinéraires, formant ainsi un réseau de transport. Les colis empruntent des itinéraires prédéfinis au sein de ce réseau, chaque mouvement étant enregistré dans un tableau d'historique.

Une fois le système opérationnel, les nouveaux colis se voient automatiquement attribuer des itinéraires et sont acheminés entre les stations comme prévu, mettant simultanément à jour les informations de localisation et l'historique. En cas de problème et d'ajustements nécessaires, les demandes de modification et les enregistrements d'événements correspondants déclenchent un réacheminement afin que le colis atteigne sa destination. Cela complète le cycle de gestion des colis et répond aux besoins opérationnels quotidiens des entreprises de livraison express.

## Prochaines Étapes

Après cela, nous avons créé un projet Jira et enregistré la progression du projet.
