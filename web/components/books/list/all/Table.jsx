import {
  Button,
  Divider,
  DataTable,
  TableHeader,
  TableBody,
  TableRow,
  TableColumn
} from 'react-md';
import moment from 'moment';
import React from 'react';

// Components
import Pagination from 'components/misc/Pagination';

// Modules
import deleteBooks from 'lib/books/delete';
import findMatches from 'lib/books/find-matching';
import loadCovers from 'lib/books/load-covers';
import countWords from 'lib/books/count-words';
import sortBooks from 'lib/books/sort';
import rand from 'lib/random/number';

export default class TableList extends React.Component {
  constructor(props) {
    super(props);

    const { state: AppState } = this.props.App;

    (this.state = {
      selected: AppState.books.length
        ? [rand(0, AppState.books.length - 1)]
        : [],
      sort: AppState.config.bookList.table.defaultSort
    }),
      /** @prop {object[]} The books that are currently rendered */
      (this.books = []);
  }

  componentDidMount() {
    loadCovers();
  }

  componentDidUpdate() {
    loadCovers();
  }

  /**
   * Called whenever a row is clicked. Only used for [un]selecting all.
   * @param {number} id - `0` if all rows.
   * @param {boolean} checked
   */
  onRowToggle(id, checked) {
    if (id !== 0) return;

    // Unselect all rows
    if (!checked) this.setState({ selected: [] });
    // Select all VISIBLE rows
    else this.setState({ selected: this.books.map(b => b.id) });
  }

  /**
   * Handle a row being clicked.
   * @param {Event} e
   * @param {number} id - The id of the book whose row was clicked
   */
  onRowClick(e, id) {
    const node = e.target.nodeName;

    if (node == 'I' || node == 'INPUT') return;

    this.onSelect(id, true, true);
  }

  /**
   * Handles [un]selecting a book row.
   * @param {number} id - The id of the selected book
   * @param {boolean} select - `true` if it was selected, `false` if unselected
   * @param {boolean} [reset=false] - If `true` it unselects all books other
   *  than this one. When `true`, `select` is also assumed to be `true`.
   */
  onSelect(id, select, reset = false) {
    const { selected } = this.state;

    // Only select this book
    if (reset) this.setState({ selected: [id] });
    // Unselect book
    else if (!select)
      this.setState({ selected: selected.filter(s => s != id) });
    // Select book if not already
    else if (selected.indexOf(id) == -1)
      this.setState({ selected: selected.concat([id]) });
  }

  onDelete() {
    const selected = this.state.selected.slice();
    this.setState({ selected: [] });

    deleteBooks(selected, this.props.App);
  }

  /** @param {string} column */
  onSort(column) {
    const { sort } = this.state;

    // Flip state.sort.asc, retain column
    if (sort.column == column)
      this.setState({ sort: { column, asc: !sort.asc } });
    // Change state.sort.column, asc always true
    else this.setState({ sort: { column, asc: true } });
  }

  /** @return {JSX.Element} */
  _renderTableHeaderRow() {
    const { columns } = this.props.App.state.config.bookList.table;
    const { sort } = this.state;

    return (
      <TableRow>
        {columns.map(col => (
          <TableColumn
            onClick={() => this.onSort(col)}
            sorted={sort.column == col ? sort.asc : undefined}
            key={col}
          >
            {col.replace(/\b[a-z]/g, c => c.toUpperCase())}
          </TableColumn>
        ))}
      </TableRow>
    );
  }

  /**
   * @param {object} book
   * @return {JSX.Element}
   */
  _renderTableBodyRow(book) {
    const { selected } = this.state;
    const { columns } = this.props.App.state.config.bookList.table;

    return (
      <TableRow
        onCheckboxClick={(i, checked, e) => this.onSelect(book.id, checked)}
        selected={selected.indexOf(book.id) > -1}
        onClick={e => this.onRowClick(e, book.id)}
        key={book.id}
      >
        {columns.map(col => {
          switch (col) {
            case 'added':
              return (
                <TableColumn className="added" key={col}>
                  {moment(book.id).format('YYYY-MM-DD')}
                </TableColumn>
              );

            case 'published':
              return (
                <TableColumn className="published" key={col}>
                  {moment(book.pubdate).format('YYYY-MM-DD')}
                </TableColumn>
              );

            default:
              return (
                <TableColumn className={col} key={col}>
                  {book[col]}
                </TableColumn>
              );
          }
        })}
      </TableRow>
    );
  }

  /** @return {JSX.Element} */
  _renderSelectedBook() {
    const { selected } = this.state;
    const { App } = this.props;
    const { books } = App.state;
    const book = books.find(b => b.id == selected[selected.length - 1]);
    if (!book) return null;

    return (
      <section className="selected-book">
        <img className="cover" id={`cover-${book.id}`} />

        <div className="controls">
          {selected.length == 1 ? (
            <Button
              icon
              secondary
              tooltipPosition="bottom"
              tooltipLabel="Read book"
              iconChildren="remove_red_eye"
              onClick={() => (location.hash = `#/books/read/${book.id}`)}
            />
          ) : null}

          <Button
            icon
            secondary
            tooltipPosition="bottom"
            tooltipLabel="Delete book"
            iconChildren="delete"
            onClick={() => this.onDelete()}
          />

          {selected.length == 1 ? (
            <Button
              icon
              secondary
              tooltipPosition="bottom"
              tooltipLabel="Count words"
              iconChildren="plus_one"
              onClick={() => countWords(App, book)}
            />
          ) : null}
        </div>

        <div className="info">
          <div className="chips">
            <span className="chip percent-complete">{book.percent}%</span>

            {book.words > 0 ? (
              <span className="chip word-count">
                {Math.round(book.words / 1000)}K
              </span>
            ) : null}

            <span className="chip date-added">
              {moment(book.id).format('YYYY-MM-DD')}
            </span>
          </div>

          <Divider />

          <span className="field title">{book.title}</span>

          <a
            className="field creator"
            href={
              `#/books/list/all?search=1&creator=` +
              encodeURIComponent(book.creator)
            }
          >
            {book.creator}
          </a>

          <span className="field published">
            Published on{' '}
            <span className="date">
              {book.pubdate ? moment(book.pubdate).format('YYYY-MM-DD') : 'N/A'}
            </span>{' '}
            by{' '}
            <span className="publisher">
              {book.publisher ? (
                <a
                  href={
                    '#/books/list/all?search=1&publisher=' +
                    encodeURIComponent(book.publisher)
                  }
                >
                  {book.publisher}
                </a>
              ) : (
                'N/A'
              )}
            </span>
          </span>

          <Divider />

          <div
            className="description"
            dangerouslySetInnerHTML={{ __html: book.description }}
          />
        </div>
      </section>
    );
  }

  render() {
    const { App } = this.props;
    const { books, search } = App.state;
    const { sort } = this.state;

    this.books = sortBooks(
      findMatches(books, search.query),
      sort.column,
      sort.asc
    ).splice((search.page - 1) * 50, 50);

    return (
      <div className="book-list table">
        <section className="table-container">
          <DataTable
            selectableRows
            indeterminate
            responsive
            onRowToggle={(id, checked) => this.onRowToggle(id, checked)}
            baseId="book-list-table"
          >
            <TableHeader>{this._renderTableHeaderRow()}</TableHeader>
            <TableBody>
              {this.books.map(b => this._renderTableBodyRow(b))}
            </TableBody>
          </DataTable>
        </section>

        {this._renderSelectedBook()}

        <Pagination
          itemsPerPage={25}
          dispatch={App.store.dispatch}
          items={books.length}
          data={App.state}
        />
      </div>
    );
  }
}
