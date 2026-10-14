---
name: bictorys-integration-notes
description: Faits Bictorys retenus comme agrégateur de paiement (décision 2026-10-14) — ce qui est documenté, ce qui se contredit, ce qui reste à tester en sandbox.
metadata:
  type: reference
  status: implemented
  updated: 2026-10-14
---

# Bictorys — notes d'intégration

> **Statut :** implémenté dans `apps/api/src/payments/` (commit `48a1f52`). La documentation Bictorys fait foi. Les choix faits là où elle est ambiguë sont listés en fin de document.

Source : guide d'intégration collé par le mainteneur (« basé sur des tests réels, mars 2026 ») et index officiel `https://docs.bictorys.com/llms.txt`. Ces faits datent de mars 2026 : **à retester en sandbox avant toute implémentation.**

## Environnements et clés

- Sandbox : `https://api.test.bictorys.com` · Production : `https://api.bictorys.com`.
- Clé **publique** (`X-Api-Key`) : création de charges, statut des transactions.
- Clé **privée** (`X-API-Key`) : payouts, liste des moyens de paiement activés.
- Secret webhook : envoyé dans `X-Secret-Key`, ou signature HMAC-SHA256 (`X-Webhook-Signature` + `X-Webhook-Timestamp`, fenêtre de 5 minutes).
- Code secret marchand : requis dans le body des payouts.

## Endpoints utilisés

| Besoin | Endpoint | Note |
| --- | --- | --- |
| Créer un paiement | `POST /pay/v1/charges?payment_type=…` | `amount` entier XOF, minimum 100. Réponse : `transactionId`, `redirectUrl`, `link`, `qrCode`, `message`. |
| Statut | `GET /pay/v1/transactions/{id}/status` | Pour une vérification ponctuelle uniquement ; le suivi passe par les webhooks. |
| Capture (carte pré-autorisée) | `POST /captures?transactionId=…` | Capture totale ou partielle, sans dépasser le montant autorisé. |
| Remboursement | `PUT /pay/v1/transactions/{id}/refund` | Réponse `202`. **Sécurité ambiguë** : l'opération déclare `bearerAuth`, les composants déclarent `X-API-Key`. À tester. |
| Payout | `POST /pay/v1/payouts?payment_type=…` | Clé privée, `idempotency-key` obligatoire, timeout 30 s conseillé. |

Le guide ne décrit **ni le remboursement ni la capture**. Ils viennent de l'index officiel.

## Statuts

- Guide : `succeeded`, `authorized`, `pending`, `processing`, `failed`, `cancelled`, `reversed`.
- Page « statuts » : `initié`, `en attente`, `succès`, `échoué`, `expiré`. Une transaction en attente depuis plus de 2 heures devient `expiré`.

## Contradiction à lever en sandbox

- Le guide décrit un webhook plat : `{ id, status: "succeeded", paymentReference, merchantFees, … }`.
- La page « statuts » décrit un webhook enveloppé : `{ event: "charge.successful", data: { status: "réussi", … } }`.

Le parseur ne doit pas être écrit avant de connaître le format réel reçu en sandbox.

## Opérateurs vérifiés en sandbox (mars 2026)

- Fonctionnels : Wave SN et CI, Orange Money SN et CI (OTP requis en CI), MTN Money CI, carte SN, CI, BF.
- En erreur : Wave BF, Orange Money BK et ML, MTN BJ, Moov (tous pays), Togocell, Mobicash.
- Pour le périmètre Sénégal : Wave SN, Orange Money SN, carte SN.

## Format des téléphones

`+` suivi de l'indicatif et du numéro, sans espaces : `+221771234567`. Le numéro n'est pas requis pour Wave SN, Orange Money SN et Maxit.

## Points à décider avant implémentation

1. **Signature invalide** : le guide recommande de répondre `200` quand même. Cela masque les tentatives forgées et empêche la relance. Proposition : `401` sur signature invalide, `200` sur tout webhook authentifié, doublons compris. À confirmer avec le comportement de relance de Bictorys.
2. **Corps brut** : la vérification HMAC exige le corps brut. `src/main.ts` crée l'application sans `rawBody: true` : à ajouter.
3. **Mode test et production** : la configuration webhook est séparée par environnement. Les deux doivent être déclarées.
4. **Périmètre de lancement** : Wave SN, Orange Money SN, carte SN, ou une autre combinaison.
5. **Frais** : `merchantFees` vient du webhook. Les commissions `COMMISSION_*` restent-elles à nous en plus ?

## Choix d'implémentation (2026-10-14)

- **Webhook et statuts** : format et statuts du guide (objet plat, `status: "succeeded"`), retenus comme source de vérité par le mainteneur (2026-10-14). Le format `{ event, data }` de la page « statuts » n'est pas implémenté ; le test en sandbox confirmera le format réel.
- **Signature invalide** : `401`. Le guide donne `200` dans son code d'exemple ; nous retenons `401` pour ne pas masquer les tentatives forgées. Écart volontaire à valider avec Bictorys (relance en cas de non-200).
- **Webhook authentifié, doublon ou montant incohérent** : `200` sans modification (doublon et montant incohérent sont journalisés).
- **Remboursement** : `PUT /pay/v1/transactions/{id}/refund` avec `X-API-Key` (clé publique). Ambiguïté doc (`bearerAuth` vs `X-API-Key`) : à tester.
- **Pays** : `SN, CI, BK, ML, TG, BJ` (table du guide). Les exemples du guide utilisent `BF` pour le Burkina : à trancher.
- **Capture et payouts** : non implémentés. Aucun parcours Phase 1 ne les utilise encore.
- **Activation après paiement** : les TODO `fulfillPayment` restent, par type d'entité.
