import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
/*HTML 要素に対応したコンポーネント
（styled.div など）以外もスタイリングできる
スタイルの情報はclassName属性として渡される*/
import produce from 'immer'
import { randomID, sortBy, reorderPatch } from './util'
import { api, ColumnID, CardID } from './api'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { DeleteDialog } from './DeleteDialog'
import { Overlay as _Overlay } from './Overlay'

type State = {
  columns?: {
    id: ColumnID
    title?: string
    text?: string
    cards?: {
      id: CardID
      text?: string
    }[]
  }[]
  cardsOrder: Record<string, CardID | ColumnID>
}

export function App() {
  //hold in app and hand over to Column and Header
  const [filterValue, setFilterValue] = useState('')
  const [{ columns, cardsOrder }, setData] = useState<State>({ cardsOrder: {} })
  //useEffect内の非同期処理は変数にまとめたほうがいい
  useEffect(() => {
    const aaaa = async () => {
      const columns = await api('GET /v1/columns', null)

      setData(
        produce((draft: State) => {
          draft.columns = columns
        }),
      )

      const [unorderedCards, cardsOrder] = await Promise.all([
        api('GET /v1/cards', null),
        api('GET /v1/cardsOrder', null),
      ])

      setData(
        produce((draft: State) => {
          draft.cardsOrder = cardsOrder
          draft.columns?.forEach(column => {
            column.cards = sortBy(unorderedCards, cardsOrder, column.id)
          })
        }),
      )
    }
    aaaa()
  }, [])
  const [draggingCardID, setDraggingCardID] = useState<CardID | undefined>(
    undefined,
  )

  const dropCardTo = (toID: CardID | ColumnID) => {
    const fromID = draggingCardID
    if (!fromID) return
    console.log(draggingCardID)

    setDraggingCardID(undefined)

    if (fromID === toID) return

    const patch = reorderPatch(cardsOrder, fromID, toID)

    // type Columns = typeof columns

    setData(
      produce((draft: State) => {
        draft.cardsOrder = {
          ...draft.cardsOrder,
          ...patch,
        }
        const unorderedCards = draft.columns?.flatMap(c => c.cards ?? []) ?? []
        draft.columns?.forEach(column => {
          column.cards = sortBy(unorderedCards, draft.cardsOrder, column.id)
        })
      }),
    )
    api('PATCH /v1/cardsOrder', patch)
    //hold state and receive deleting info from card????
  }
  const setText = (columnID: ColumnID, value: string) => {
    setData(
      produce((draft: State) => {
        const column = draft.columns?.find(c => c.id === columnID)
        if (!column) return

        column.text = value
      }),
    )
  }
  const addCard = (columnID: ColumnID) => {
    const column = columns?.find(c => c.id === columnID)
    if (!column) return

    const text = column.text
    const cardID = randomID() as CardID
    console.log(cardID)

    const patch = reorderPatch(cardsOrder, cardID, cardsOrder[columnID])

    setData(
      produce((draft: State) => {
        /**
         * draft.columns?.find(...) で ID に該当する Column が見つからないときに加え、
         * column.cards が undefined のときも以降の処理をスキップしている。
         * column.cards が undefined のときは、API から Card 一覧を取得していない
         * 段階なので、並び替え処理をする意味がない。
         */
        const column = draft.columns?.find(c => c.id === columnID)
        if (!column?.cards) return
        //unshift() return new arrangement's length with adding new element more than one in the first position
        //if there is none skip process
        column.cards.unshift({
          id: cardID,
          text: column.text,
        })
        column.text = ''
        draft.cardsOrder = {
          ...draft.cardsOrder,
          ...patch,
        }
      }),
    )
    //setDataの引数は冪等な関数にしておきたい
    //API 通信はネットワークやバックエンドサーバーの影響を受け結果が予想できない
    api('POST /v1/cards', {
      id: cardID,
      text,
    })
    api('PATCH /v1/cardsOrder', patch)
  }
  const [deletingCardID, setDeletingCardID] = useState<CardID | undefined>(
    undefined,
  )
  const deleteCard = () => {
    const cardID = deletingCardID
    console.log('aaa', cardID)
    if (!cardID) return

    setDeletingCardID(undefined)

    const patch = reorderPatch(cardsOrder, cardID)
    // type Columns = typeof columns
    setData(
      produce((draft: State) => {
        const column = draft.columns?.find(col =>
          col.cards?.some(c => c.id === cardID),
        )
        if (!column?.cards) return

        column.cards = column.cards.filter(c => c.id !== cardID)
        draft.cardsOrder = {
          ...draft.cardsOrder,
          ...patch,
        }
      }),
    )
    api('DELETE /v1/cards', {
      id: cardID,
    })
    api('PATCH /v1/cardsOrder', patch)
  }
  return (
    <Container>
      <Header filterValue={filterValue} onFilterChange={setFilterValue} />
      <MainArea>
        <HorizontalScroll>
          {!columns ? (
            <Loading />
          ) : (
            columns.map(({ id: columnID, title, cards, text }) => (
              <Column
                key={columnID}
                title={title}
                filterValue={filterValue}
                cards={cards}
                onCardDragStart={cardID => setDraggingCardID(cardID)}
                onCardDrop={entered => dropCardTo(entered ?? columnID)}
                onCardDeleteClick={cardID => setDeletingCardID(cardID)}
                text={text}
                onTextChange={value => setText(columnID, value)}
                onTextConfirm={() => addCard(columnID)}
              />
            ))
          )}
        </HorizontalScroll>
      </MainArea>
      {deletingCardID && (
        <Overlay onClick={() => setDeletingCardID(undefined)}>
          <DeleteDialog
            onConfirm={deleteCard}
            onCancel={() => setDeletingCardID(undefined)}
          />
        </Overlay>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-flow: column;
  height: 100%;
`

//use _Header instead of div
const Header = styled(_Header)`
  flex-shrink: 0;
`
const MainArea = styled.div`
  height: 100%;
  padding: 16px 0;
  overflow-y: auto;
`
const HorizontalScroll = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  > * {
    margin-left: 16px;
    flex-shrink: 0;
  }
  ::after {
    display: block;
    flex: 0 0 16px;
    content: '';
  }
`
const Overlay = styled(_Overlay)`
  display: flex;
  justify-content: center;
  align-items: center;
`
const Loading = styled.div.attrs({
  children: 'Loading...',
})`
  font-size: 14px;
`
