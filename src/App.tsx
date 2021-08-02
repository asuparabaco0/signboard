import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
/*HTML 要素に対応したコンポーネント
（styled.div など）以外もスタイリングできる
スタイルの情報はclassName属性として渡される*/
import produce from 'immer'
import { randomID, sortBy } from './util'
import { api } from './api'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { DeleteDialog } from './DeleteDialog'
import { Overlay as _Overlay } from './Overlay'

type State = {
  columns?:{
  id: string
  title?: string
  text?: string
  cards?: {
    id: string
    text?: string
  }[]
}[]
  cardsOrder: Record<string,string>
}

export function App() {
  //hold in app and hand over to Column and Header
  const [filterValue, setFilterValue] = useState('')
  const [{columns}, setData] = useState<State>({ cardsOrder: {} })

  // useEffect(() => {
  //   const aaaa = async () => {
  //     const columns = await api('GET /v1/columns', null)

  //     setData(
  //       produce((draft: State) => {
  //         draft.columns = columns
  //       }),
  //     )
      
  //     const [unorderedCards, cardsOrder] = await Promise.all([
  //       api('GET /v1/cards', null),
  //       api('GET /v1/cardsOrder', null),
  //     ])
      
  //     setData(
  //       produce((draft: State) => {
  //         draft.cardsOrder = cardsOrder
  //         draft.columns?.forEach(column => {
  //           column.cards = sortBy(unorderedCards, cardsOrder, column.id)
  //         })
  //       }),
  //     )
  //   }
  //   aaaa()
  // }, [])
  const [draggingCardID, setDraggingCardID] = useState<string | undefined>(
    undefined,
  )

  const dropCardTo = (toID: string) => {
    const fromID = draggingCardID
    if (!fromID) return
    console.log(draggingCardID)

    setDraggingCardID(undefined)

    if (fromID === toID) return

    type Columns = typeof columns

    setData(
      produce((draft: State) => {
        const card = draft.columns
          ?.flatMap(col => col.cards ?? [])
          .find(c => c.id === fromID)
        if (!card) return

        const fromColumn = draft.columns?.find(col =>
          //return boolean
          col.cards?.some(c => c.id === fromID),
        )
        if (!fromColumn?.cards) return

        fromColumn.cards = fromColumn.cards.filter(c => c.id !== fromID)

        const toColumn = draft.columns?.find(
          col => col.id === toID || col.cards?.some(c => c.id === toID),
        )
        if (!toColumn?.cards) return

        let index = toColumn.cards.findIndex(c => c.id === toID)
        if (index < 0) {
          index = toColumn.cards.length
        }
        toColumn.cards.splice(index, 0, card)
      }),
    )
    //hold state and receive deleting imfo from card
  }
  const setText = (columnID: string, value: string) => {
    setData(
      produce((draft: State) => {
        const column = draft.columns?.find(c => c.id === columnID)
        if (!column) return

        column.text = value
      }),
    )
  }
  const addCard = (columnID: string) => {
    const column = columns?.find(c => c.id === columnID)
    if (!column) return

    const text = column.text
    const cardID = randomID()

    setData(
      produce((draft: State) => {
        const column = draft.columns?.find(c => c.id === columnID)
        if (!column) return
        //unshift() return new arrangement's length with adding new element more than one in the first position
        column.cards?.unshift({
          id: cardID,
          text: column.text,
        })
        column.text = ''
      }),
    )
    //setDataの引数は冪等な関数にしておきたい
    //API 通信はネットワークやバックエンドサーバーの影響を受け結果が予想できない
    api('POST /v1/cards', {
      id: cardID,
      text,
    })
  }
  const [deletingCardID, setDeletingCardID] = useState< string | undefined >(
    undefined,
  )
  const deleteCard = () => {
    const cardID = deletingCardID
    console.log('aaa', cardID)
    if (!cardID) return

    setDeletingCardID(undefined)
    console.log(deletingCardID)
    // type Columns = typeof columns
    setData(
      produce((draft: State) => {
        const column = draft.columns?.find(col => col.cards?.some(c => c.id === cardID))
        if (!column) return

        column.cards = column.cards?.filter(c => c.id !== cardID)
      }),
    )
    console.log('iii')
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